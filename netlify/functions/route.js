exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { coordinates, mode } = JSON.parse(event.body);

    // API key is stored in environment variable (never exposed to client)
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/${mode}/geojson?api_key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TransitPal/1.0'
        },
        body: JSON.stringify({ coordinates })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      let errorMsg = errorData || `HTTP ${response.status}`;
      try {
        const json = JSON.parse(errorData);
        errorMsg = json.error?.message || json.error || errorData;
      } catch (e) {}
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorMsg })
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
