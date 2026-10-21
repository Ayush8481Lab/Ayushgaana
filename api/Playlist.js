// api/playlist.js — Vercel Edge Function
// GET /api/playlist?seo=<seokey>[&strip=1]
// (alias: ?id=... also works)

export const config = { runtime: 'edge' };

const KEY_STR      = 'gy1t#b@jl(b$wtme';
const IV_STR       = 'xC4dmVJAq14BfntX';
const HLS_BASE_URL = 'https://vodhlsgaana-ebw.akamaized.net/';
const USER_AGENT   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const DEFAULT_COOKIE =
    'tc=dark; deviceId=aeeb9d85-0c9d-4bd6-8870-a9a2306dc2e8; ' +
    'deviceType=GaanaWebsiteApp; ver=v0.0.46; playerloaded=1';

const TE      = new TextEncoder();
const IV      = TE.encode(IV_STR);
const ZERO_IV = new Uint8Array(16);

const RESP_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store, max-age=0',
};

// -------- crypto (identical to stream.js) --------
let _keyPromise = null;
function getKey() {
    if (!_keyPromise) {
        _keyPromise = crypto.subtle.importKey(
            'raw', TE.encode(KEY_STR), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']
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
        { name: 'AES-CBC', iv: IV }, key, combined
    ));
}

function b64decode(str) {
    str = str.replace(/\s+/g, '').replace(/=+$/, '');
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

async function decryptMessage(msg, key) {
    const offset = msg.charCodeAt(0) - 48;
    if (offset < 0 || offset > 9) throw new Error('bad offset');
    const ct = b64decode(msg.slice(offset + 16));
    if (!ct || !ct.length) throw new Error('bad ciphertext');
    const plain = await decryptRaw(ct, key);
    let hlsIdx = -1;
    for (let i = 0, end = plain.length - 4; i <= end; i++) {
        if (plain[i] === 0x68 && plain[i+1] === 0x6c && plain[i+2] === 0x73 && plain[i+3] === 0x2f) {
            hlsIdx = i;
            break;
        }
    }
    if (hlsIdx === -1) throw new Error('no hls path');
    let path = '';
    for (let i = hlsIdx; i < plain.length; i++) {
        const c = plain[i];
        if (c < 0x20 || c > 0x7e) break;
        path += String.fromCharCode(c);
    }
    return HLS_BASE_URL + path;
}

async function decryptAllUrls(root, key, strip) {
    const jobs = [];
    const visit = (o) => {
        if (o === null || typeof o !== 'object') return;
        if (Array.isArray(o)) { for (const item of o) visit(item); return; }
        if (
            typeof o.message === 'string' &&
            o.message.length > 20 &&
            o.message.charCodeAt(0) >= 48 && o.message.charCodeAt(0) <= 57 &&
            ('bitRate' in o || 'expiryTime' in o)
        ) {
            jobs.push(o);
        }
        for (const k of Object.keys(o)) visit(o[k]);
    };
    visit(root);
    if (!jobs.length) return;
    await Promise.all(jobs.map(async (node) => {
        try {
            node.hls_url = await decryptMessage(node.message, key);
            if (strip) delete node.message;
        } catch (e) {
            node.hls_error = String(e?.message || e);
        }
    }));
}

const fail = (status, obj) => new Response(
    JSON.stringify(obj), { status, headers: RESP_HEADERS }
);

// -------- handler --------
export default async function handler(req) {
    const u      = new URL(req.url);
    const seo    = u.searchParams.get('seo') || u.searchParams.get('id');
    const strip  = u.searchParams.get('strip') === '1';
    const cookie = u.searchParams.get('cookie') || DEFAULT_COOKIE;

    if (!seo) return fail(400, { success: false, error: 'missing seo' });

    // The exact working endpoint you provided
    const apiUrl = `https://gaana.com/apiv2?type=playlistDetail&seokey=${encodeURIComponent(seo)}`;

    // Minimal headers — same pattern that made stream.js work
    const headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'referer': 'https://gaana.com/',
        'origin': 'https://gaana.com',
        'user-agent': USER_AGENT,
        'cookie': cookie,
    };

    let text, status;
    try {
        const res = await fetch(apiUrl, {
            headers,
            cache: 'no-store',
            redirect: 'follow',
        });
        status = res.status;
        text = await res.text();
    } catch (e) {
        return fail(502, { success: false, error: 'fetch failed: ' + (e?.message || 'unknown') });
    }

    const trimmed = text.trimStart();
    if (trimmed.startsWith('<')) {
        return fail(502, {
            success: false,
            error: 'HTML response (WAF or wrong endpoint)',
            http_status: status,
            url_called: apiUrl,
            preview: trimmed.slice(0, 300),
        });
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        return fail(502, {
            success: false,
            error: 'invalid JSON: ' + (e?.message || 'parse error'),
            http_status: status,
            preview: text.slice(0, 300),
        });
    }

    // Decrypt every urls.*.message in the tree
    await decryptAllUrls(data, await getKey(), strip);

    return new Response(JSON.stringify(data), { status: 200, headers: RESP_HEADERS });
}
