// api/playlist.js
// Usage: /api/playlist?seo=gaana-dj-international-weekly-hot-20
// Returns Gaana playlistDetail JSON with urls.*.url and preview_url.url decoded.
// Add &decode=0 to skip decoding and get the raw response.

export const config = { runtime: 'edge' };

const KEY          = 'gy1t#b@jl(b$wtme';
const IV           = 'xC4dmVJAq14BfntX';
const HLS_BASE_URL = 'https://vodhlsgaana-ebw.akamaized.net/';
const USER_AGENT   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const TE       = new TextEncoder();
const IV_BYTES = TE.encode(IV);
const ZERO_IV  = new Uint8Array(16);

// ---------------- crypto (same as apistream.js) ----------------
let _keyPromise = null;
function getKey() {
    if (!_keyPromise) {
        _keyPromise = crypto.subtle.importKey(
            'raw', TE.encode(KEY), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']
        );
    }
    return _keyPromise;
}

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
    if (mod === 2) str += '=='; else if (mod === 3) str += '=';
    try {
        const bin = atob(str);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    } catch { return null; }
}

// Decrypt a "message"-style blob:
//   [0]        = offset digit 0-9
//   [1..off]   = variable junk
//   [off+1..15]= 15 fixed chars
//   [off+16..] = base64 ciphertext
async function decryptMessage(encrypted) {
    if (!encrypted || typeof encrypted !== 'string') return '';
    const offset = encrypted.charCodeAt(0) - 48;
    if (offset < 0 || offset > 9) return '';
    const ct = b64decode(encrypted.slice(offset + 16));
    if (!ct || !ct.length) return '';
    let plain;
    try { plain = await decryptRaw(ct, await getKey()); } catch { return ''; }
    let txt = '';
    for (let i = 0; i < plain.length; i++) {
        const c = plain[i];
        if (c >= 0x20 && c <= 0x7e) txt += String.fromCharCode(c);
    }
    return txt;
}

// Turn decrypted text into a usable URL.
// - full http(s) URL   -> return as-is
// - contains "hls/..." -> prefix with HLS_BASE_URL (same as apistream.js)
// - anything else      -> return raw text
async function resolveUrl(encrypted) {
    const txt = await decryptMessage(encrypted);
    if (!txt) return '';
    if (/^https?:\/\//i.test(txt)) return txt;
    const idx = txt.indexOf('hls/');
    if (idx !== -1) return HLS_BASE_URL + txt.slice(idx);
    return txt;
}

const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store, max-age=0',
};

export default async function handler(req) {
    const url = new URL(req.url);

    const seo = (url.searchParams.get('seo') || url.searchParams.get('seokey') || '').trim();
    const quality = url.searchParams.get('quality') || 'high';
    const trackId = url.searchParams.get('track_id') || '';
    const decode  = url.searchParams.get('decode') !== '0'; // on by default

    if (!seo) {
        return new Response(
            JSON.stringify({ error: 'Missing ?seo=' }, null, 2),
            { status: 400, headers: JSON_HEADERS }
        );
    }

    const apiUrl =
        `https://gaana.com/apiv2?type=playlistDetail&seokey=${encodeURIComponent(seo)}`;

    const payload =
        'quality=' + encodeURIComponent(quality) +
        '&track_id=' + encodeURIComponent(trackId) +
        '&stream_format=mp4';

    const apiHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://gaana.com',
        'Referer': 'https://gaana.com/',
    };

    try {
        const apiRes = await fetch(apiUrl, {
            method: 'POST',
            headers: apiHeaders,
            body: payload,
            cache: 'no-store',
            redirect: 'follow',
        });

        const raw = await apiRes.text();

        if (!decode) {
            return new Response(raw, { status: apiRes.status, headers: JSON_HEADERS });
        }

        let data;
        try { data = JSON.parse(raw); } catch {
            // Not JSON (blocked / HTML response) — pass through as-is
            return new Response(raw, { status: apiRes.status, headers: JSON_HEADERS });
        }

        // Decode all urls.*.message and preview_url.message in parallel
        if (Array.isArray(data.tracks)) {
            await Promise.all(data.tracks.map(async (t) => {
                const tasks = [];

                if (t.urls && typeof t.urls === 'object') {
                    for (const q of Object.keys(t.urls)) {
                        const item = t.urls[q];
                        if (item && typeof item.message === 'string') {
                            tasks.push(
                                resolveUrl(item.message).then(decoded => {
                                    if (decoded) item.url = decoded;
                                }).catch(() => {})
                            );
                        }
                    }
                }

                if (t.preview_url && typeof t.preview_url.message === 'string') {
                    tasks.push(
                        resolveUrl(t.preview_url.message).then(decoded => {
                            if (decoded) t.preview_url.url = decoded;
                        }).catch(() => {})
                    );
                }

                await Promise.all(tasks);
            }));
        }

        return new Response(JSON.stringify(data, null, 2), {
            status: apiRes.status,
            headers: JSON_HEADERS,
        });
    } catch (e) {
        return new Response(
            JSON.stringify({ error: e?.message || String(e) }, null, 2),
            { status: 502, headers: JSON_HEADERS }
        );
    }
        }
