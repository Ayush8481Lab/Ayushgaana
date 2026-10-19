// api/stream.js — Vercel Edge Function (no caching, minimum overhead)
// GET /api/stream?id=<track_id>[&quality=high|medium|low]

export const config = { runtime: 'edge' };

const KEY_STR      = 'gy1t#b@jl(b$wtme';
const IV_STR       = 'xC4dmVJAq14BfntX';
const HLS_BASE_URL = 'https://vodhlsgaana-ebw.akamaized.net/';
const USER_AGENT   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const TE      = new TextEncoder();
const IV      = TE.encode(IV_STR);
const ZERO_IV = new Uint8Array(16);

const RESP_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store, max-age=0',
};

const API_HEADERS = {
    'content-type': 'application/x-www-form-urlencoded',
    'user-agent': USER_AGENT,
    'accept': 'application/json, text/plain, */*',
    'origin': 'https://gaana.com',
    'referer': 'https://gaana.com/',
};

// cache CryptoKey per isolate (not the response — just the key object)
let _keyPromise = null;
function getKey() {
    if (!_keyPromise) {
        _keyPromise = crypto.subtle.importKey(
            'raw', TE.encode(KEY_STR), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']
        );
    }
    return _keyPromise;
}

// AES-128-CBC decrypt with zero padding (mirrors OpenSSL OPENSSL_ZERO_PADDING).
// Appends one block so WebCrypto's PKCS#7 remover strips only that block.
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
        { name: 'AES-CBC', iv: IV }, key, combined
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

const fail = (status, error) => new Response(
    JSON.stringify({ success: false, error }),
    { status, headers: RESP_HEADERS }
);

export default async function handler(req) {
    const u = new URL(req.url);
    const trackId = u.searchParams.get('id');
    if (!trackId) return fail(400, 'missing id');
    const quality = u.searchParams.get('quality') || 'high';

    // ---- 1. fetch stream_path from Gaana ----
    let data;
    try {
        const res = await fetch('https://gaana.com/api/stream-url', {
            method: 'POST',
            headers: API_HEADERS,
            body: 'quality=' + encodeURIComponent(quality)
                + '&track_id=' + encodeURIComponent(trackId)
                + '&stream_format=mp4',
            cache: 'no-store',
        });
        data = await res.json();
    } catch (e) {
        return fail(502, 'upstream: ' + (e?.message || 'fail'));
    }

    if (!data || data.api_status !== 'success' || !data.data?.stream_path) {
        return fail(502, 'no stream_path');
    }

    // ---- 2. decrypt ----
    const sp = String(data.data.stream_path);
    const offset = sp.charCodeAt(0) - 48;
    if (offset < 0 || offset > 9) return fail(502, 'bad offset');

    const ct = b64decode(sp.slice(offset + 16));
    if (!ct || !ct.length) return fail(502, 'bad ciphertext');

    let plain;
    try {
        plain = await decryptRaw(ct, await getKey());
    } catch (e) {
        return fail(502, 'decrypt: ' + (e?.message || 'fail'));
    }

    // ---- 3. find "hls/" and read printable path (byte-level, no string dupes) ----
    let hlsIdx = -1;
    for (let i = 0, end = plain.length - 4; i <= end; i++) {
        if (plain[i] === 0x68 && plain[i+1] === 0x6c && plain[i+2] === 0x73 && plain[i+3] === 0x2f) {
            hlsIdx = i;
            break;
        }
    }
    if (hlsIdx === -1) return fail(502, 'no hls path');

    let path = '';
    for (let i = hlsIdx; i < plain.length; i++) {
        const c = plain[i];
        if (c < 0x20 || c > 0x7e) break;
        path += String.fromCharCode(c);
    }

    // ---- 4. respond ----
    return new Response(
        '{"success":true'
        + ',"track_id":' + JSON.stringify(trackId)
        + ',"quality":' + JSON.stringify(quality)
        + ',"hls_url":' + JSON.stringify(HLS_BASE_URL + path)
        + ',"bit_rate":' + JSON.stringify(data.data.bit_rate || '')
        + ',"track_format":' + JSON.stringify(data.data.track_format || '')
        + '}',
        { status: 200, headers: RESP_HEADERS }
    );
        }
