// api/stream.js — Vercel Edge Function
// Usage: /api/stream?id=<track_id>[&quality=high|medium|low]

export const config = { runtime: 'edge' };

const KEY_STR      = 'gy1t#b@jl(b$wtme';
const IV_STR       = 'xC4dmVJAq14BfntX';
const HLS_BASE_URL = 'https://vodhlsgaana-ebw.akamaized.net/';
const USER_AGENT   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const TE = new TextEncoder();
const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
};

// cache the imported CryptoKey across warm invocations
let _keyPromise = null;
function getAesKey() {
    if (!_keyPromise) {
        _keyPromise = crypto.subtle.importKey(
            'raw',
            TE.encode(KEY_STR),
            { name: 'AES-CBC' },
            false,
            ['encrypt', 'decrypt']
        );
    }
    return _keyPromise;
}

// AES-128-CBC decrypt WITHOUT PKCS#7 removal (matches OpenSSL OPENSSL_ZERO_PADDING).
// Web Crypto always strips PKCS#7, so we append a computed block that decrypts
// to a full 0x10*16 padding block. Web Crypto removes only that block; the
// original plaintext (including any trailing padding bytes) is preserved.
async function decryptRaw(ciphertext, key) {
    if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
        return new Uint8Array(0);
    }
    const iv = TE.encode(IV_STR);
    const lastBlock = ciphertext.slice(ciphertext.length - 16);

    // dExtra = 0x10*16 XOR C_last  →  D(C_extra) XOR C_last = 0x10*16
    const dExtra = new Uint8Array(16);
    for (let i = 0; i < 16; i++) dExtra[i] = 0x10 ^ lastBlock[i];

    // C_extra = E(dExtra): get it via CBC encrypt with zero IV (first block)
    const enc = new Uint8Array(await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: new Uint8Array(16) },
        key,
        dExtra
    ));
    const cExtra = enc.slice(0, 16);

    const combined = new Uint8Array(ciphertext.length + 16);
    combined.set(ciphertext);
    combined.set(cExtra, ciphertext.length);

    const plain = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        key,
        combined
    );
    return new Uint8Array(plain);
}

function b64decode(str) {
    str = str.replace(/\s+/g, '');
    const mod = str.length % 4;
    if (mod === 2) str += '==';
    else if (mod === 3) str += '=';
    else if (mod === 1) return null;
    try {
        const bin = atob(str);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    } catch {
        return null;
    }
}

function respond(status, obj, extraHeaders) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { ...JSON_HEADERS, ...(extraHeaders || {}) },
    });
}

export default async function handler(request) {
    const url = new URL(request.url);
    const trackId = url.searchParams.get('id');
    const quality = url.searchParams.get('quality') || 'high';

    if (!trackId) return respond(400, { success: false, error: 'missing id' });

    try {
        const body = new URLSearchParams({
            quality,
            track_id: trackId,
            stream_format: 'mp4',
        }).toString();

        const apiRes = await fetch('https://gaana.com/api/stream-url', {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'user-agent': USER_AGENT,
                'accept': 'application/json, text/plain, */*',
                'origin': 'https://gaana.com',
                'referer': 'https://gaana.com/',
            },
            body,
        });

        const data = await apiRes.json().catch(() => null);
        if (!data || data.api_status !== 'success' || !data.data?.stream_path) {
            return respond(502, {
                success: false,
                error: 'no stream_path',
                api_status: data?.api_status,
                http: apiRes.status,
            });
        }

        const sp = String(data.data.stream_path);
        const offset = parseInt(sp[0], 10);
        if (!Number.isFinite(offset)) {
            return respond(502, { success: false, error: 'bad offset' });
        }

        const ct = b64decode(sp.slice(offset + 16));
        if (!ct || ct.length === 0) {
            return respond(502, { success: false, error: 'bad ciphertext' });
        }

        const key = await getAesKey();
        const plain = await decryptRaw(ct, key);

        // strip nulls + non-printables (matches original)
        let txt = '';
        for (let i = 0; i < plain.length; i++) {
            const c = plain[i];
            if (c >= 0x20 && c <= 0x7e) txt += String.fromCharCode(c);
        }

        const idx = txt.indexOf('hls/');
        if (idx === -1) {
            return respond(502, { success: false, error: 'no hls path' });
        }

        const hlsUrl = HLS_BASE_URL + txt.slice(idx);

        return respond(200, {
            success: true,
            track_id: trackId,
            quality,
            hls_url: hlsUrl,
            bit_rate: data.data.bit_rate || '',
            track_format: data.data.track_format || '',
        }, {
            // CDN caches the JSON for 5 min → near-zero latency on repeats
            'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
        });
    } catch (e) {
        return respond(500, { success: false, error: e?.message || String(e) });
    }
}
