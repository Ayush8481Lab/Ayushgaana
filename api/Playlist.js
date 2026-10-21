// api/playlist.js — Vercel Node.js Function
// GET /api/playlist?seo=<dynamic_seokey>

// Set the runtime to Node.js to use different outbound IPs
export const config = { runtime: 'nodejs' };

// AES-128-CBC key/IV for decrypting stream URLs
const KEY_STR = 'gy1t#b@jl(b$wtme';
const IV_STR = 'xC4dmVJAq14BfntX';
const HLS_BASE_URL = 'https://vodhlsgaana-ebw.akamaized.net/';

// Headers that match the working pattern
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const COOKIE = 'tc=dark; deviceId=aeeb9d85-0c9d-4bd6-8870-a9a2306dc2e8; deviceType=GaanaWebsiteApp; ver=v0.0.46; playerloaded=1';

// --- Crypto Functions (using Node's built-in WebCrypto) ---
// These are identical to your working stream.js logic.
let _keyPromise = null;
async function getAesKey() {
    if (!_keyPromise) {
        _keyPromise = crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(KEY_STR),
            { name: 'AES-CBC' },
            false,
            ['encrypt', 'decrypt']
        );
    }
    return _keyPromise;
}

async function decryptMessage(encryptedMessage, key) {
    const offset = encryptedMessage.charCodeAt(0) - 48;
    if (offset < 0 || offset > 9) throw new Error('bad offset');

    const ciphertextB64 = encryptedMessage.slice(offset + 16);
    const b64Padded = ciphertextB64.replace(/=+$/, '') + '='.repeat((4 - (ciphertextB64.length % 4)) % 4);
    
    const binaryString = atob(b64Padded);
    const ciphertext = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        ciphertext[i] = binaryString.charCodeAt(i);
    }

    if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
        throw new Error('Invalid ciphertext length');
    }

    // This padding trick mirrors OpenSSL's ZERO_PADDING to avoid WebCrypto's automatic PKCS#7 removal.
    const lastBlock = ciphertext.slice(-16);
    const extraBlockPlaintext = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        extraBlockPlaintext[i] = 16 ^ lastBlock[i];
    }

    const zeroIv = new Uint8Array(16);
    const extraBlockCiphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-CBC', iv: zeroIv }, key, extraBlockPlaintext)
    );

    const combinedCiphertext = new Uint8Array(ciphertext.length + 16);
    combinedCiphertext.set(ciphertext);
    combinedCiphertext.set(extraBlockCiphertext.slice(0, 16), ciphertext.length);

    const iv = new TextEncoder().encode(IV_STR);
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        key,
        combinedCiphertext
    );

    const decryptedBytes = new Uint8Array(decryptedBuffer);
    let hlsPath = '';
    for (let i = 0; i < decryptedBytes.length; i++) {
        const charCode = decryptedBytes[i];
        if (charCode >= 32 && charCode <= 126) {
            hlsPath += String.fromCharCode(charCode);
        } else if (hlsPath.length > 0) {
            break;
        }
    }

    const hlsIndex = hlsPath.indexOf('hls/');
    if (hlsIndex === -1) throw new Error('HLS path not found in decrypted data');
    
    return HLS_BASE_URL + hlsPath.slice(hlsIndex);
}

// --- JSON Tree Walker ---
// Finds every object that looks like a URL payload and adds `hls_url`.
async function decryptAllUrls(rootObject, key) {
    const jobs = [];
    const visit = (node) => {
        if (node === null || typeof node !== 'object') return;
        if (Array.isArray(node)) {
            for (const item of node) visit(item);
            return;
        }

        if (
            typeof node.message === 'string' &&
            node.message.length > 20 &&
            node.message.charCodeAt(0) >= 48 && node.message.charCodeAt(0) <= 57 &&
            ('bitRate' in node || 'expiryTime' in node)
        ) {
            jobs.push(node);
        }

        for (const key of Object.keys(node)) visit(node[key]);
    };
    visit(rootObject);

    if (jobs.length === 0) return;

    await Promise.all(jobs.map(async (node) => {
        try {
            node.hls_url = await decryptMessage(node.message, key);
        } catch (error) {
            node.hls_error = String(error.message || error);
        }
    }));
}

// --- Main API Handler ---
export default async function handler(request) {
    const { searchParams } = new URL(request.url);
    const seoKey = searchParams.get('seo') || searchParams.get('id');

    if (!seoKey) {
        return new Response(JSON.stringify({ success: false, error: 'Missing required parameter: seo' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    // The single, exact endpoint you specified.
    const apiUrl = `https://gaana.com/apiv2?type=playlistDetail&seokey=${encodeURIComponent(seoKey)}`;

    // Minimal headers that are known to work on non-Edge environments.
    const headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'referer': 'https://gaana.com/',
        'origin': 'https://gaana.com',
        'user-agent': USER_AGENT,
        'cookie': COOKIE,
    };

    try {
        const response = await fetch(apiUrl, {
            headers,
            cache: 'no-store',
            redirect: 'follow',
        });

        const rawText = await response.text();
        const trimmedText = rawText.trimStart();

        // If the response is HTML, it's a WAF block.
        if (trimmedText.startsWith('<')) {
            return new Response(JSON.stringify({
                success: false,
                error: 'HTML response received (likely a WAF block)',
                http_status: response.status,
                url_called: apiUrl,
                preview: trimmedText.slice(0, 300),
            }), {
                status: 502,
                headers: { 'content-type': 'application/json' },
            });
        }

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseError) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid JSON received from upstream',
                http_status: response.status,
                preview: rawText.slice(0, 300),
            }), {
                status: 502,
                headers: { 'content-type': 'application/json' },
            });
        }

        // If we have valid JSON, proceed to decrypt all URLs.
        const aesKey = await getAesKey();
        await decryptAllUrls(data, aesKey);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'content-type': 'application/json',
                'access-control-allow-origin': '*',
                'cache-control': 'no-store, max-age=0',
            },
        });

    } catch (fetchError) {
        return new Response(JSON.stringify({
            success: false,
            error: `Fetch failed: ${fetchError.message}`,
        }), {
            status: 502,
            headers: { 'content-type': 'application/json' },
        });
    }
        }
