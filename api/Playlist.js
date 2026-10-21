// playlist.js
// Usage: /api/playlist?seo=gaana-dj-international-weekly-hot-20

export default async function handler(req, res) {
  // Enable CORS if you plan to call this from a browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { seo } = req.query;

  if (!seo) {
    return res.status(400).json({ error: 'Missing required query parameter: seo' });
  }

  const gaanaUrl = `https://gaana.com/apiv2?type=playlistDetail&seokey=${encodeURIComponent(seo)}`;

  // Equivalent to PHP's http_build_query(...)
  const payload = new URLSearchParams({
    quality: 'high',
    track_id: '8481',
    stream_format: 'mp4',
  }).toString();

  const commonHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://gaana.com/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin: 'https://gaana.com/',
  };

  try {
    // POST request with form-encoded payload (matches http_build_query)
    const postResponse = await fetch(gaanaUrl, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload).toString(),
      },
      body: payload,
    });

    if (postResponse.ok) {
      const data = await postResponse.json();
      return res.status(200).json(data);
    }

    // Fallback: some Gaana endpoints only accept GET; send payload as query params
    const getUrl = `${gaanaUrl}&${payload}`;
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: commonHeaders,
    });

    if (!getResponse.ok) {
      throw new Error(
        `Gaana API failed — POST ${postResponse.status}, GET ${getResponse.status}`
      );
    }

    const data = await getResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Gaana API error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch playlist from Gaana',
      details: error.message,
    });
  }
        }
