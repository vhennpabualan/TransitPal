// =====================
// TRANSITPAL - COMMUTER GUIDE
// Free APIs: Leaflet, OpenStreetMap, OSRM, Nominatim
// =====================

class TransitPal {
    constructor() {
        this.map = null;
        this.markers = [];
        this.routeLayer = null;
        this.startCoords = null;
        this.endCoords = null;
        this.currentRoute = null;
        
        this.init();
        this.loadFavorites();
    }

    init() {
        this.initMap();
        this.attachEventListeners();
    }

    // Initialize Leaflet Map
    initMap() {
        this.map = L.map('map').setView([8.4866, 124.6648], 13); // Cagayan de Oro City default

        // OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);
    }

    attachEventListeners() {
        document.getElementById('searchInput').addEventListener('input', 
            (e) => this.handleSearch(e.target.value)
        );
        
        document.getElementById('findRouteBtn').addEventListener('click',
            () => this.findRoute()
        );

        document.getElementById('swapBtn').addEventListener('click',
            () => this.swapPoints()
        );

        document.getElementById('saveFavoriteBtn').addEventListener('click',
            () => this.saveFavorite()
        );
    }

    // =====================
    // SEARCH & GEOCODING (Nominatim)
    // =====================
    async handleSearch(query) {
        if (query.length < 3) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                {
                    headers: {
                        'User-Agent': 'TransitPal/1.0'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const results = await response.json();

            const resultsDiv = document.getElementById('searchResults');
            resultsDiv.innerHTML = '';

            if (results.length === 0) {
                resultsDiv.innerHTML = '<p style="color: #999; font-size: 0.9em;">No results found</p>';
                return;
            }

            results.forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `<strong>${result.name}</strong><br><small>${result.display_name}</small>`;
                item.addEventListener('click', () => {
                    this.selectLocation(
                        parseFloat(result.lat),
                        parseFloat(result.lon),
                        result.name
                    );
                });
                resultsDiv.appendChild(item);
            });
        } catch (error) {
            console.error('Search error:', error);
            document.getElementById('searchResults').innerHTML = '<p style="color: #e74c3c; font-size: 0.9em;">Error: ' + error.message + '</p>';
        }
    }

    selectLocation(lat, lon, name) {
        // Add marker to map
        this.clearMarkers();
        const marker = L.marker([lat, lon])
            .bindPopup(`<strong>${name}</strong>`)
            .addTo(this.map)
            .openPopup();
        this.markers.push(marker);

        // Center map
        this.map.setView([lat, lon], 15);

        // Clear search results
        document.getElementById('searchResults').innerHTML = '';
    }

    // =====================
    // ROUTE FINDING (OSRM)
    // =====================
    async findRoute() {
        const startText = document.getElementById('startPoint').value.trim();
        const endText = document.getElementById('endPoint').value.trim();
        const mode = document.getElementById('routeMode').value;

        if (!startText || !endText) {
            alert('Please enter both starting point and destination');
            return;
        }

        const findBtn = document.getElementById('findRouteBtn');
        findBtn.disabled = true;
        findBtn.textContent = 'Finding route...';

        try {
            // Geocode start point
            console.log('Geocoding start point:', startText);
            const startCoords = await this.geocodeLocation(startText);
            if (!startCoords) {
                alert('Could not find "' + startText + '".\n\nTry adding city name or use the search feature first.');
                findBtn.disabled = false;
                findBtn.textContent = 'Find Route';
                return;
            }

            // Add delay to respect API rate limits
            await new Promise(resolve => setTimeout(resolve, 500));

            // Geocode end point
            console.log('Geocoding end point:', endText);
            const endCoords = await this.geocodeLocation(endText);
            if (!endCoords) {
                alert('Could not find "' + endText + '".\n\nTry adding city name or use the search feature first.');
                findBtn.disabled = false;
                findBtn.textContent = 'Find Route';
                return;
            }

            this.startCoords = startCoords;
            this.endCoords = endCoords;

            console.log('Getting route from', startCoords, 'to', endCoords);

            // Get route
            const route = await this.getRouteFromOSRM(startCoords, endCoords, mode);
            this.displayRoute(route, startText, endText, mode);
        } catch (error) {
            console.error('Route finding error:', error);
            alert('Error finding route:\n\n' + error.message + '\n\nPlease try again.');
        } finally {
            findBtn.disabled = false;
            findBtn.textContent = 'Find Route';
        }
    }

    async geocodeLocation(locationName) {
        try {
            const query = `${locationName}, Cagayan de Oro`;
            console.log('Geocoding:', query);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
                {
                    headers: {
                        'User-Agent': 'TransitPal/1.0'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Nominatim error: ${response.status} ${response.statusText}`);
            }

            const results = await response.json();
            console.log('Geocoding results:', results);

            if (!results || results.length === 0) {
                return null;
            }

            return {
                lat: parseFloat(results[0].lat),
                lon: parseFloat(results[0].lon),
                name: results[0].name
            };
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    }

    async getRouteFromOSRM(start, end, mode) {
        // Using Netlify Functions proxy to keep API key secure
        const modeMap = {
            'driving': 'driving-car',
            'cycling': 'cycling-regular',
            'walking': 'foot-walking'
        };
        const orsMode = modeMap[mode] || 'driving-car';

        try {
            console.log('Requesting route via Netlify proxy');

            // Call Netlify function instead of external API directly
            const response = await fetch('/.netlify/functions/route', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    coordinates: [
                        [start.lon, start.lat],
                        [end.lon, end.lat]
                    ],
                    mode: orsMode
                })
            });

            console.log('Route API Response status:', response.status);

            if (!response.ok) {
                let errorMsg = 'Unknown error';
                try {
                    const errorData = await response.text();
                    console.log('Error response:', errorData);
                    try {
                        const json = JSON.parse(errorData);
                        errorMsg = json.error?.message || json.error || errorData || `HTTP ${response.status}`;
                    } catch {
                        errorMsg = errorData || `HTTP ${response.status} ${response.statusText}`;
                    }
                } catch (e) {
                    errorMsg = `HTTP ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log('Route data received:', data);

            if (!data.features || data.features.length === 0) {
                throw new Error('No route found between these locations. Try different addresses.');
            }

            const route = data.features[0];
            console.log('Route parsed successfully');
            return {
                geometry: {
                    type: 'LineString',
                    coordinates: route.geometry.coordinates
                },
                distance: route.properties.summary.distance,
                duration: route.properties.summary.duration
            };
        } catch (error) {
            console.error('Routing error:', error);
            throw new Error(`Route error: ${error.message}`);
        }
    }

    displayRoute(route, startName, endName, mode) {
        try {
            console.log('Displaying route:', route);

            // Verify map exists
            if (!this.map) {
                throw new Error('Map not initialized');
            }

            // Clear previous route
            if (this.routeLayer && this.map) {
                this.map.removeLayer(this.routeLayer);
            }
            this.clearMarkers();

            // Extract coordinates from GeoJSON
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            console.log('Route coordinates:', coords);

            if (coords.length < 2) {
                throw new Error('Invalid route coordinates');
            }

            // Draw route line (blue dashed line)
            this.routeLayer = L.polyline(coords, {
                color: '#667eea',
                weight: 5,
                opacity: 0.8,
                dashArray: '5, 5',
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(this.map);

            // Add start marker (Blue - A)
            const startMarker = L.marker(coords[0], { 
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDMyIDQ4Ij48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIGZpbGw9IiM2N2VlZWEiIHJ4PSI0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZhbWlseT0iQXJpYWwiPkE8L3RleHQ+PC9zdmc+',
                    iconSize: [32, 48],
                    iconAnchor: [16, 48],
                    popupAnchor: [0, -48]
                })
            }).bindPopup(`<strong>Start</strong><br>${startName}`, { closeButton: false }).addTo(this.map).openPopup();

            // Add end marker (Red - B)
            const endMarker = L.marker(coords[coords.length - 1], {
                icon: L.icon({
                    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDMyIDQ4Ij48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIGZpbGw9IiNlNzRjM2MiIHJ4PSI0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSJ3aGl0ZSIgZm9udC1zaXplPSIyMCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZhbWlseT0iQXJpYWwiPkI8L3RleHQ+PC9zdmc+',
                    iconSize: [32, 48],
                    iconAnchor: [16, 48],
                    popupAnchor: [0, -48]
                })
            }).bindPopup(`<strong>Destination</strong><br>${endName}`, { closeButton: false }).addTo(this.map);

            this.markers.push(startMarker, endMarker);

            // Fit map to route bounds
            const bounds = this.routeLayer.getBounds();
            this.map.fitBounds(bounds, { padding: [50, 50] });

            // Display route info
            const distance = (route.distance / 1000).toFixed(2); // km
            const duration = Math.round(route.duration / 60); // minutes
            
            document.getElementById('distance').textContent = `${distance} km`;
            document.getElementById('duration').textContent = `${duration} min`;
            document.getElementById('routeInfo').style.display = 'block';

            // Store current route
            this.currentRoute = {
                startName,
                endName,
                mode,
                distance,
                duration,
                startCoords: this.startCoords,
                endCoords: this.endCoords
            };

            console.log('Route displayed successfully');
        } catch (error) {
            console.error('Display route error:', error);
            throw error;
        }
    }

    swapPoints() {
        const start = document.getElementById('startPoint');
        const end = document.getElementById('endPoint');
        [start.value, end.value] = [end.value, start.value];
    }

    // =====================
    // FAVORITES (localStorage)
    // =====================
    saveFavorite() {
        if (!this.currentRoute) {
            alert('No active route to save');
            return;
        }

        let favorites = JSON.parse(localStorage.getItem('transitpalFavorites')) || [];
        const routeName = `${this.currentRoute.startName} → ${this.currentRoute.endName}`;
        
        const duplicate = favorites.find(f => 
            f.startName === this.currentRoute.startName && 
            f.endName === this.currentRoute.endName
        );

        if (!duplicate) {
            favorites.push({
                id: Date.now(),
                ...this.currentRoute
            });
            localStorage.setItem('transitpalFavorites', JSON.stringify(favorites));
            alert(`Route saved: ${routeName}`);
            this.loadFavorites();
        } else {
            alert('This route is already saved');
        }
    }

    loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('transitpalFavorites')) || [];
        const favoritesList = document.getElementById('favoritesList');
        favoritesList.innerHTML = '';

        if (favorites.length === 0) {
            favoritesList.innerHTML = '<p style="color: #999; font-size: 0.9em;">No saved routes yet</p>';
            return;
        }

        favorites.forEach(route => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.innerHTML = `
                <div style="flex: 1; cursor: pointer;">
                    <div><strong>${route.startName}</strong></div>
                    <div style="font-size: 0.8em; color: #666;">→ ${route.endName}</div>
                    <div style="font-size: 0.75em; color: #999;">${route.distance} km • ${route.duration} min</div>
                </div>
                <button class="favorite-delete">×</button>
            `;

            // Load route on click
            item.querySelector('div').addEventListener('click', () => {
                document.getElementById('startPoint').value = route.startName;
                document.getElementById('endPoint').value = route.endName;
                document.getElementById('routeMode').value = route.mode;
                this.findRoute();
            });

            // Delete favorite
            item.querySelector('.favorite-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                const updated = favorites.filter(f => f.id !== route.id);
                localStorage.setItem('transitpalFavorites', JSON.stringify(updated));
                this.loadFavorites();
            });

            favoritesList.appendChild(item);
        });
    }

    clearMarkers() {
        if (this.map) {
            this.markers.forEach(marker => {
                this.map.removeLayer(marker);
            });
        }
        this.markers = [];
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TransitPal();
});
