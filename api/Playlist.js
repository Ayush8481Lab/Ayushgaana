// api/playlist.js — Vercel Node.js Function
// GET /api/playlist?seo=<seokey>
//
// Exact port of strem.php, but for the playlist endpoint.
// - Same POST method
// - Same headers (Content-Type, User-Agent, Accept, Origin, Referer)
// - Same payload pattern (quality, track_id, stream_format)
// - Same createDecipheriv AES-128-CBC with setAutoPadding(false)
// - Walks the JSON tree, adds hls_url to every urls.*.message

export const config = { runtime: 'nodejs' };

import { createDecipheriv } from 'crypto';

// ---------------- config ----------------
const KEY               = 'gy1t#b@jl(b$wtme';
const IV                = 'xC4dmVJAq14BfntX';
const HLS_BASE_URL      = 'https://vodhlsgaana-ebw.akamaized.net/';
const USER_AGENT        = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const DEFAULT_TRACK_ID  = '80692668';

// ---------------- decryption (identical to PHP) ----------------
function decryptStreamPath(encrypted) {
    if (!encrypted || typeof encrypted !== 'string') return '';

    const offset = parseInt(encrypted[0], 10);
    if (isNaN(offset)) return '';

    const ciphertextB64 = encrypted.substring(offset + 16);
    const ciphertext    = Buffer.from(ciphertextB64 + '==', 'base64');
    if (!ciphertext.length) return '';

    let decrypted;
    try {
        const d = createDecipheriv(
            'aes-128-cbc',
            Buffer.from(KEY, 'utf8'),
            Buffer.from(IV, 'utf8')
        );
        d.setAutoPadding(false);
        decrypted = Buffer.concat([d.update(ciphertext), d.final()]);
    } catch {
        // fallback: try with auto padding
        try {
            const d = createDecipheriv(
                'aes-128-cbc',
                Buffer.from(KEY, 'utf8'),
                Buffer.from(IV, 'utf8')
            );
            decrypted = Buffer.concat([d.update(ciphertext), d.final()]);
        } catch {
            return '';
        }
    }

    // strip nulls + non-printable ASCII (exactly like PHP)
    let rawText = decrypted.toString('utf8').replace(/\0/g, '');
    rawText = rawText.split('').filter((c) => {
        const code = c.charCodeAt(0);
        return code >= 32 && code <= 126;
    }).join('');

    const idx = rawText.indexOf('hls/');
    if (idx === -1) return '';
    return HLS_BASE_URL + rawText.substring(idx);
}

// ---------------- tree walker ----------------
function decryptAllUrls(root) {
    const visit = (o) => {
        if (o === null || typeof o !== 'object') return;
        if (Array.isArray(o)) {
            for (const item of o) visit(item);
            return;
        }
        if (
            typeof o.message === 'string' &&
            o.message.length > 20 &&
            o.message.charCodeAt(0) >= 48 &&
            o.message.charCodeAt(0) <= 57 &&
            ('bitRate' in o || 'expiryTime' in o)
        ) {
            try {
                const hls = decryptStreamPath(o.message);
                if (hls) o.hls_url = hls;
            } catch (e) {
                o.hls_error = String(e?.message || e);
            }
        }
        for (const k of Object.keys(o)) visit(o[k]);
    };
    visit(root);
}

// ---------------- handler ----------------
export default async function handler(req, res) {
    const seo     = req.query.seo || req.query.id || 'gaana-dj-international-weekly-hot-20';
    const trackId = req.query.track_id || DEFAULT_TRACK_ID;
    const quality = req.query.quality || 'high';

    // EXACT endpoint you specified
    const apiUrl = `https://gaana.com/apiv2?type=playlistDetail&seokey=${encodeURIComponent(seo)}`;

    // EXACT payload pattern from the PHP
    const payload =
        'quality='       + encodeURIComponent(quality) +
        '&track_id='     + encodeURIComponent(trackId) +
        '&stream_format=mp4';

    // EXACT headers from the PHP
    const apiHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':   USER_AGENT,
        'Accept':       'application/json, text/plain, */*',
        'Origin':       'https://gaana.com',
        'Referer':      'https://gaana.com/',
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: apiHeaders,
            body: payload,
        });
        const text     = await response.text();
        const httpCode = response.status;

        // HTML detection — show exactly what came back
        const trimmed = text.trimStart();
        if (trimmed.startsWith('<')) {
            return res.status(502).json({
                success:     false,
                error:       'HTML response from upstream',
                http_code:   httpCode,
                url_called:  apiUrl,
                payload_sent: payload,
                preview:     trimmed.slice(0, 400),
            });
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            return res.status(502).json({
                success:   false,
                error:     'invalid JSON from upstream',
                http_code: httpCode,
                preview:   text.slice(0, 400),
            });
        }

        // Decrypt every urls.*.message in the playlist tree
        decryptAllUrls(data);

        return res.status(200).json(data);
    } catch (e) {
        return res.status(502).json({
            success: false,
            error:   'fetch failed: ' + (e?.message || 'unknown'),
        });
    }
        }
