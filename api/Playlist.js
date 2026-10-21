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

  try {
    // The user requested a POST request. Gaana's apiv2 endpoint
    // often works with GET, but we follow the POST instruction here.
    const response = await fetch(gaanaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // These headers help mimic a browser and avoid simple bot blocks
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://gaana.com/',
        'Accept': 'application/json, text/plain, */*',
      },
      // The apiv2 endpoint usually does not require a body for playlistDetail,
      // but you can send an empty JSON object to be safe.
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      // If POST fails, try a GET fallback (the endpoint often accepts GET)
      const getResponse = await fetch(gaanaUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://gaana.com/',
          'Accept': 'application/json, text/plain, */*',
        },
      });

      if (!getResponse.ok) {
        throw new Error(`Gaana API responded with status ${getResponse.status}`);
      }

      const data = await getResponse.json();
      return res.status(200).json(data);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Gaana API error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch playlist from Gaana',
      details: error.message,
    });
  }
    }
