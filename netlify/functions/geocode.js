// netlify/functions/geocode.js
// Proxy function for Nominatim Geocoding API
// Works around CORS issues

exports.handler = async (event) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { query } = event.queryStringParameters || {};

        if (!query || query.length < 3) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Query too short (min 3 chars)' })
            };
        }

        // Call Nominatim API server-side (no CORS issues!)
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
            {
                headers: {
                    'User-Agent': 'TransitPal/1.0 (Netlify Function)'
                }
            }
        );

        if (!response.ok) {
            console.error(`Nominatim API error: ${response.status}`);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Geocoding service error' })
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Geocode function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};