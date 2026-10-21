// playlist.js
// Usage: /api/playlist?seo=gaana-dj-international-weekly-hot-20
// Optional: &quality=high&track_id=123456

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { seo, quality = 'high', track_id: trackId = '' } = req.query;

  if (!seo) {
    return res.status(400).json({ error: 'Missing required query parameter: seo' });
  }

  const apiUrl = `https://gaana.com/apiv2?type=playlistDetail&seokey=${encodeURIComponent(seo)}`;

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

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({
        error: 'Gaana API request failed',
        status: apiRes.status,
        statusText: apiRes.statusText,
        body: raw.slice(0, 500), // truncate in case it's an HTML block page
      });
    }

    // Gaana sometimes returns JSON with a leading BOM / stray whitespace
    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      return res.status(502).json({
        error: 'Gaana returned a non-JSON response',
        body: raw.slice(0, 500),
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Gaana API error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch playlist from Gaana',
      details: error.message,
    });
  }
      }
