// netlify/functions/route.js
// Proxy function for OSRM Routing API
// Works around CORS issues

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { startLon, startLat, endLon, endLat, mode } = JSON.parse(event.body);

        // Validate inputs
        if (!startLon || !startLat || !endLon || !endLat || !mode) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters' })
            };
        }

        // Validate mode
        const validModes = ['car', 'foot', 'bike'];
        if (!validModes.includes(mode)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid travel mode' })
            };
        }

        // Call OSRM API server-side (no CORS issues!)
        const response = await fetch(
            `https://router.project-osrm.org/route/v1/${mode}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`,
            {
                headers: {
                    'User-Agent': 'TransitPal/1.0 (Netlify Function)'
                }
            }
        );

        if (!response.ok) {
            console.error(`OSRM API error: ${response.status}`);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Routing service error' })
            };
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'No route found' })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Route function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};