// api/playlist.js
// Usage:
//   /api/playlist?seo=gaana-dj-international-weekly-hot-20
//   /api/playlist?seo=...&quality=high&streams=1   -> also fetch per-track HLS URLs
//   /api/playlist?seo=...&debug=1

export const config = { runtime: 'edge' };

const KEY          = 'gy1t#b@jl(b$wtme';
const IV           = 'xC4dmVJAq14BfntX';
const HLS_BASE_URL = 'https://vodhlsgaana-ebw.akamaized.net/';
const USER_AGENT   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const TE       = new TextEncoder();
const IV_BYTES = TE.encode(IV);
const ZERO_IV  = new Uint8Array(16);

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

async function decryptStreamPath(encrypted) {
    if (!encrypted) return '';
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
    const idx = txt.indexOf('hls/');
    if (idx === -1) return '';
    return HLS_BASE_URL + txt.slice(idx);
}

const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store, max-age=0',
};
const fail = (s, o) => new Response(JSON.stringify(o, null, 2), { status: s, headers: JSON_HEADERS });

async function callPlaylistDetail(seoKey, quality, trackId = '') {
    const apiUrl = `https://gaana.com/apiv2?type=playlistDetail&seokey=${encodeURIComponent(seoKey)}`;
    const payload =
        'quality=' + encodeURIComponent(quality) +
        '&track_id=' + encodeURIComponent(trackId) +
        '&stream_format=mp4';
    const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://gaana.com',
            'Referer': 'https://gaana.com/',
        },
        body: payload,
        cache: 'no-store',
        redirect: 'follow',
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    return { status: res.status, data, raw: text };
}

async function streamForTrack(trackId, quality) {
    // per-track call — same as apistream.js STEP 1+2
    const { data } = await callPlaylistDetail('', quality, trackId); // no seokey = generic stream lookup
    // If the endpoint needs the same seokey, swap the line above for the seokey version.
    const sp = data?.data?.stream_path;
    if (!sp) return null;
    const hls = await decryptStreamPath(String(sp));
    return hls || null;
}

export default async function handler(req) {
    const url   = new URL(req.url);
    const seo   = (url.searchParams.get('seo') || url.searchParams.get('seokey') || '').trim();
    const quality = (() => {
        const q = (url.searchParams.get('quality') || 'high').toLowerCase();
        return ['low', 'medium', 'high'].includes(q) ? q : 'high';
    })();
    const wantStreams = url.searchParams.get('streams') === '1';
    const debug       = url.searchParams.get('debug') === '1';

    if (!seo) return fail(400, { success: false, error: 'Missing ?seo=' });

    try {
        const { status, data, raw } = await callPlaylistDetail(seo, quality);

        if (!data || data.api_status !== 'success') {
            return fail(502, {
                success: false,
                error: 'Gaana playlistDetail failed',
                http_code: status,
                api_response: raw.slice(0, 400),
            });
        }

        const tracks = data?.data?.tracks || data?.tracks || [];

        if (!Array.isArray(tracks) || tracks.length === 0) {
            return fail(502, {
                success: false,
                error: 'No tracks in response',
                api_response: data?.data ? Object.keys(data.data) : null,
            });
        }

        // Map each track. Try to reuse any per-track stream_path Gaana already sent.
        const out = [];
        for (const t of tracks) {
            const row = {
                track_id:   t.track_id || t.id || null,
                title:      t.track_title || t.title || null,
                artists:    Array.isArray(t.artist) ? t.artist.map(a => a.name).join(', ')
                            : (t.artists || t.artist || null),
                duration_s: t.duration ?? null,
                hls_url:    null,
            };

            // Many playlistDetail payloads embed a per-track stream_path.
            const perTrackSp = t.stream_path || t?.urls?.stream_path || null;
            if (perTrackSp) {
                row.hls_url = await decryptStreamPath(String(perTrackSp)) || null;
            } else if (wantStreams && row.track_id) {
                // Fallback: one extra request per track.
                row.hls_url = await streamForTrack(String(row.track_id), quality);
            }

            out.push(row);
        }

        const result = {
            success:      true,
            seo,
            quality,
            playlist_title: data?.data?.playlist_title || data?.data?.title || null,
            total_tracks: out.length,          // <-- this should now be ~50
            tracks:       out,
        };
        if (debug) result.debug = { api_status: data.api_status, top_level_keys: Object.keys(data.data || {}) };
        return new Response(JSON.stringify(result, null, 2), { status: 200, headers: JSON_HEADERS });

    } catch (e) {
        return fail(502, { success: false, error: e?.message || String(e) });
    }
                                  }
