// api/stream.js — exact port of strem.php
// Usage:
//   /api/stream?track_id=80692668
//   /api/stream?track_id=80692668&quality=medium
//   /api/stream?track_id=80692668&parse=1
//   /api/stream?track_id=80692668&debug=1
// (alias: ?id=... also works)

export const config = { runtime: 'edge' };

const KEY          = 'gy1t#b@jl(b$wtme';
const IV           = 'xC4dmVJAq14BfntX';
const HLS_BASE_URL = 'https://vodhlsgaana-ebw.akamaized.net/';
const USER_AGENT   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const TE         = new TextEncoder();
const IV_BYTES   = TE.encode(IV);
const ZERO_IV    = new Uint8Array(16);

// ---------------- crypto ----------------
let _keyPromise = null;
function getKey() {
    if (!_keyPromise) {
        _keyPromise = crypto.subtle.importKey(
            'raw', TE.encode(KEY), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']
        );
    }
    return _keyPromise;
}

// AES-128-CBC decrypt without PKCS#7 removal (mirrors OPENSSL_ZERO_PADDING).
async function decryptRaw(ct, key) {
    if (!ct.length || (ct.length & 15)) return new Uint8Array(0);
    const lastBlock = ct.subarray(ct.length - 16);
    const dExtra = new Uint8Array(16);
    for (let i = 0; i < 16; i++) dExtra[i] = 16 ^ lastBlock[i];
    const encBuf = new Uint8Array(await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: ZERO_IV }, key, dExtra
    ));
    const combined = new Uint8Array(ct.length + 16);
    combined.set(ct);
    combined.set(encBuf.subarray(0, 16), ct.length);
    return new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: IV_BYTES }, key, combined
    ));
}

function b64decode(str) {
    str = str.replace(/\s+/g, '');
    const mod = str.length & 3;
    if (mod === 1) return null;
    if (mod === 2) str += '==';
    else if (mod === 3) str += '=';
    try {
        const bin = atob(str);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    } catch { return null; }
}

async function decryptStreamPath(encrypted) {
    if (!encrypted) return '';
    const offset = encrypted.charCodeAt(0) - 48;
    if (offset < 0 || offset > 9) return '';

    const ct = b64decode(encrypted.slice(offset + 16));
    if (!ct || !ct.length) return '';

    let plain;
    try { plain = await decryptRaw(ct, await getKey()); } catch { return ''; }

    // strip nulls + non-printables (matches PHP's preg_replace('/[^\x20-\x7E]/',''))
    let txt = '';
    for (let i = 0; i < plain.length; i++) {
        const c = plain[i];
        if (c >= 0x20 && c <= 0x7e) txt += String.fromCharCode(c);
    }

    const idx = txt.indexOf('hls/');
    if (idx === -1) return '';
    return HLS_BASE_URL + txt.slice(idx);
}

// ---------------- HLS helpers (same as PHP) ----------------
function getBaseUrl(url) {
    const noQuery = url.split('?')[0];
    const lastSlash = noQuery.lastIndexOf('/');
    return lastSlash !== -1 ? noQuery.substring(0, lastSlash + 1) : noQuery;
}

function resolveUrl(baseUrl, path) {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/')) {
        const schemeEnd = baseUrl.indexOf('://');
        if (schemeEnd !== -1) {
            const pathStart = baseUrl.indexOf('/', schemeEnd + 3);
            if (pathStart !== -1) return baseUrl.substring(0, pathStart) + path;
        }
    }
    return baseUrl + path;
}

async function fetchPlaylist(url) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error('playlist fetch ' + res.status);
    const text = await res.text();
    return text.split(/\r?\n/).map(s => s.trim());
}

function parseStreamPlaylist(playlistUrl, lines) {
    const baseUrl = getBaseUrl(playlistUrl);
    let initUrl = null;
    const segments = [];
    let currentMs = 6000;

    for (const line of lines) {
        if (!line) continue;

        if (line.startsWith('#EXT-X-MAP:')) {
            const m = line.match(/URI="([^"]+)"/);
            if (m) initUrl = resolveUrl(baseUrl, m[1]);
        }

        if (line.startsWith('#EXTINF:')) {
            const dur = line.substring(8).split(',')[0];
            currentMs = Math.round(parseFloat(dur) * 1000) || 6000;
        }

        if (!line.startsWith('#')) {
            if (/\.(ts|m4s|mp4|m4a|aac)(\?|$)/i.test(line)) {
                segments.push({ url: resolveUrl(baseUrl, line), duration_ms: currentMs });
                currentMs = 6000;
            }
        }
    }

    const total = segments.reduce((s, x) => s + x.duration_ms, 0);
    return { init_url: initUrl, segments, total_duration_ms: total };
}

async function parseHlsManifest(masterUrl) {
    const masterLines = await fetchPlaylist(masterUrl);
    if (!masterLines.length) throw new Error('Empty HLS playlist');

    const baseUrl = getBaseUrl(masterUrl);
    let streamUrl = null;

    for (const line of masterLines) {
        if (line && !line.startsWith('#') && /\.m3u8(\?|$)/.test(line)) {
            streamUrl = resolveUrl(baseUrl, line);
            break;
        }
    }

    if (!streamUrl) return parseStreamPlaylist(masterUrl, masterLines);
    return parseStreamPlaylist(streamUrl, await fetchPlaylist(streamUrl));
}

// ---------------- handler ----------------
const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store, max-age=0',
};

const fail = (status, obj) => new Response(
    JSON.stringify(obj, null, 2), { status, headers: JSON_HEADERS }
);

export default async function handler(req) {
    const url = new URL(req.url);
    const trackId = (
        url.searchParams.get('track_id') ||
        url.searchParams.get('id') ||
        ''
    ).trim();
    let quality = url.searchParams.get('quality') || 'high';
    const parse = url.searchParams.get('parse') === '1';
    const debug = url.searchParams.get('debug') === '1';

    if (!trackId) return fail(400, { error: 'Missing track_id' });
    if (!['low', 'medium', 'high'].includes(quality)) quality = 'high';

    try {
        // ---- STEP 1: POST apiv2?type=playlistDetail&seokey=... (exactly like PHP) ----
        const apiUrl = 'https://gaana.com/apiv2?type=playlistDetail&seokey=gaana-dj-international-weekly-hot-20';

        const payload = 'quality=' + encodeURIComponent(quality)
                      + '&track_id=' + encodeURIComponent(trackId)
                      + '&stream_format=mp4';

        const apiHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://gaana.com',
            'Referer': 'https://gaana.com/',
        };

        const apiRes = await fetch(apiUrl, {
            method: 'POST',
            headers: apiHeaders,
            body: payload,
            cache: 'no-store',
            redirect: 'follow',
        });

        const rawText = await apiRes.text();
        let data;
        try { data = JSON.parse(rawText); } catch {
            return fail(502, {
                success: false,
                error: 'API did not return stream_path',
                http_code: apiRes.status,
                api_response: rawText.slice(0, 400),
            });
        }

        if (!data || data.api_status !== 'success' || !data.data?.stream_path) {
            return fail(502, {
                success: false,
                error: 'API did not return stream_path',
                http_code: apiRes.status,
                api_response: data,
            });
        }

        // ---- STEP 2: decrypt ----
        const streamPath = String(data.data.stream_path);
        const hlsUrl = await decryptStreamPath(streamPath);

        if (hlsUrl === '') {
            const err = {
                success: false,
                error: 'Decryption failed',
                stream_path: streamPath,
            };
            if (debug) {
                err.debug = {
                    offset: streamPath.charCodeAt(0) - 48,
                    b64_len: streamPath.length - ((streamPath.charCodeAt(0) - 48) + 16),
                    api_data: data.data,
                };
            }
            return fail(502, err);
        }

        // ---- STEP 3: build response (same shape as PHP) ----
        const result = {
            success: true,
            track_id: trackId,
            quality,
            hls_url: hlsUrl,
            bit_rate: data.data.bit_rate || '',
            track_format: data.data.track_format || '',
        };

        if (debug) {
            result.debug = {
                api_url: apiUrl,
                api_payload: payload,
                stream_path: streamPath,
                decrypted_raw_len: hlsUrl.length,
            };
        }

        if (parse) {
            try {
                const m = await parseHlsManifest(hlsUrl);
                result.segment_count = m.segments.length;
                result.duration_ms = m.total_duration_ms;
                result.init_url = m.init_url;
                result.first_segment = m.segments[0]?.url || null;
                result.segments = m.segments.map(s => s.url);
            } catch (e) {
                result.parse_error = e?.message || String(e);
            }
        }

        return new Response(JSON.stringify(result, null, 2), { status: 200, headers: JSON_HEADERS });
    } catch (e) {
        return fail(502, { success: false, error: e?.message || String(e) });
    }
        }
