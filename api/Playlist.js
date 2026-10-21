// api/playlist.js
// Usage:
//   /api/playlist?seo=gaana-dj-international-weekly-hot-20
//   /api/playlist?seo=...&quality=high&track_id=12345
// Returns the raw Gaana playlistDetail JSON, unmodified.

export const config = { runtime: 'edge' };

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store, max-age=0',
};

export default async function handler(req) {
    const url = new URL(req.url);

    const seo = (
        url.searchParams.get('seo') ||
        url.searchParams.get('seokey') ||
        ''
    ).trim();

    const quality = url.searchParams.get('quality') || 'high';
    const trackId = url.searchParams.get('track_id') || '';

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

        return new Response(raw, {
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
