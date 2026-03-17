// =====================
// TRANSITPAL - SMART ROUTE NAVIGATOR
// Modern Version with Notifications, Rate Limiting & Theme Toggle
// Free APIs: Leaflet, OpenStreetMap, OSRM, Nominatim
// =====================

// =====================
// NOTIFICATION SYSTEM
// =====================

class Notifications {
    static showModal(title, message, type = 'error') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const iconMap = {
            error: '❌',
            success: '✅',
            warning: '⚠️',
            info: 'ℹ️'
        };

        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header ${type}">
                    <span>${iconMap[type]}</span>
                    <span>${title}</span>
                </div>
                <div class="modal-body">${message}</div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        OK
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Auto-close after 5 seconds (unless error)
        if (type !== 'error') {
            setTimeout(() => {
                if (overlay.parentElement) {
                    overlay.remove();
                }
            }, 5000);
        }
    }

    static showToast(message, type = 'info', duration = 3000) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const iconMap = {
            error: '❌',
            success: '✅',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${iconMap[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
        `;

        container.appendChild(toast);

        // Auto-remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }
}

// =====================
// UTILITY FUNCTIONS
// =====================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =====================
// TRANSITPAL CLASS
// =====================

class TransitPal {
    constructor() {
        this.map = null;
        this.markers = [];
        this.routeLayer = null;
        this.startCoords = null;
        this.endCoords = null;
        this.startName = null;
        this.endName = null;
        this.currentRoute = null;
        this.currentMode = 'car';
        this.favorites = [];
        this.lastSearchTime = 0;
        this.lastRouteTime = 0;
        
        this.init();
    }

    init() {
        this.loadThemePreference();
        this.initMap();
        this.loadFavorites();
        this.attachEventListeners();
        this.setDefaultLocation();
    }

    // Initialize Leaflet Map
    initMap() {
        this.map = L.map('map').setView([8.4866, 124.6648], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        this.map.attributionControl.setPrefix('');
    }

    setDefaultLocation() {
        const defaultLat = 8.4866;
        const defaultLon = 124.6648;
        this.map.setView([defaultLat, defaultLon], 13);
    }

    attachEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Search with debouncing to prevent rate limiting
        const debouncedSearch = debounce((value) => {
            this.handleSearch(value);
        }, 500); // Wait 500ms after user stops typing

        document.getElementById('searchInput').addEventListener('input', 
            (e) => debouncedSearch(e.target.value)
        );

        // Route finding
        document.getElementById('findRouteBtn').addEventListener('click',
            () => this.findRoute()
        );

        // Swap points
        document.getElementById('swapBtn').addEventListener('click',
            () => this.swapPoints()
        );

        // Save favorite
        document.getElementById('saveFavoriteBtn').addEventListener('click',
            () => this.saveFavorite()
        );

        // Travel mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentMode = e.currentTarget.dataset.mode;
                document.getElementById('routeMode').value = this.currentMode;
                Notifications.showToast('🚗 ' + e.currentTarget.textContent.trim() + ' mode selected', 'info', 2000);
            });
        });

        // Map controls
        document.getElementById('zoomInBtn').addEventListener('click',
            () => this.map.zoomIn()
        );
        document.getElementById('zoomOutBtn').addEventListener('click',
            () => this.map.zoomOut()
        );
        document.getElementById('locateBtn').addEventListener('click',
            () => this.getCurrentLocation()
        );

        // Enter key on inputs
        document.getElementById('startPoint').addEventListener('keypress',
            (e) => { if (e.key === 'Enter') this.findRoute(); }
        );
        document.getElementById('endPoint').addEventListener('keypress',
            (e) => { if (e.key === 'Enter') this.findRoute(); }
        );
    }

    // =====================
    // SEARCH & GEOCODING
    // =====================
    async handleSearch(query) {
        if (query.length < 3) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }

        // Rate limiting: wait 1 second between searches
        const now = Date.now();
        if (now - this.lastSearchTime < 1000) {
            return;
        }
        this.lastSearchTime = now;

        try {
            // Use Netlify function to avoid CORS issues
            const functionUrl = window.location.hostname === 'localhost' 
                ? `http://localhost:8888/.netlify/functions/geocode?query=${encodeURIComponent(query)}`
                : `/.netlify/functions/geocode?query=${encodeURIComponent(query)}`;

            const response = await fetch(functionUrl);

            if (response.status === 429) {
                Notifications.showToast('⏳ Search rate limited - please wait a moment', 'warning', 3000);
                return;
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const results = await response.json();
            const resultsDiv = document.getElementById('searchResults');
            resultsDiv.innerHTML = '';

            if (!Array.isArray(results) || results.length === 0) {
                resultsDiv.innerHTML = '<div style="padding: 8px; color: var(--text-tertiary); font-size: 0.85em; text-align: center;">No results found</div>';
                return;
            }

            results.forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `<strong>${result.name}</strong><small>${result.display_name}</small>`;
                item.addEventListener('click', () => {
                    this.selectLocation(
                        parseFloat(result.lat),
                        parseFloat(result.lon),
                        result.name
                    );
                    resultsDiv.innerHTML = '';
                    Notifications.showToast(`📍 Located: ${result.name}`, 'success', 2000);
                });
                resultsDiv.appendChild(item);
            });
        } catch (error) {
            console.error('Search error:', error);
            Notifications.showModal(
                'Search Failed',
                'Could not search for locations. Please try again.',
                'error'
            );
        }
    }

    selectLocation(lat, lon, name) {
        this.clearMarkers();
        const marker = L.marker([lat, lon], {
            icon: L.icon({
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            })
        })
        .addTo(this.map)
        .bindPopup(name);

        this.markers.push(marker);
        this.map.setView([lat, lon], 15);
    }

    // =====================
    // ROUTE PLANNING (OSRM)
    // =====================
    async findRoute() {
        const startInput = document.getElementById('startPoint').value.trim();
        const endInput = document.getElementById('endPoint').value.trim();

        if (!startInput || !endInput) {
            Notifications.showModal(
                'Missing Information',
                'Please enter both starting point and destination to find a route.',
                'warning'
            );
            return;
        }

        try {
            const findRouteBtn = document.getElementById('findRouteBtn');
            findRouteBtn.classList.add('loading');
            findRouteBtn.disabled = true;
            
            findRouteBtn.innerHTML = '<i class="fas fa-compass"></i> Finding Route';

            // Rate limiting: wait 2 seconds between route requests
            const now = Date.now();
            if (now - this.lastRouteTime < 2000) {
                Notifications.showToast('⏳ Please wait before finding another route', 'warning', 2000);
                this.resetButton();
                return;
            }
            this.lastRouteTime = now;

            // Geocode start point
            const startGeo = await this.geocode(startInput);
            if (!startGeo) {
                Notifications.showModal(
                    'Location Not Found',
                    `Could not find location: "${startInput}"\n\nTry a more specific address or different location name.`,
                    'error'
                );
                this.resetButton();
                return;
            }

            // Geocode end point
            const endGeo = await this.geocode(endInput);
            if (!endGeo) {
                Notifications.showModal(
                    'Location Not Found',
                    `Could not find location: "${endInput}"\n\nTry a more specific address or different location name.`,
                    'error'
                );
                this.resetButton();
                return;
            }

            this.startCoords = startGeo;
            this.endCoords = endGeo;
            this.startName = startInput;
            this.endName = endInput;

            // Get route from OSRM
            await this.getRoute();
            
        } catch (error) {
            console.error('Route error:', error);
            Notifications.showModal(
                'Route Planning Failed',
                'Could not calculate route. Please try different locations.',
                'error'
            );
        } finally {
            this.resetButton();
        }
    }

    async geocode(location) {
        try {
            const functionUrl = window.location.hostname === 'localhost' 
                ? `http://localhost:8888/.netlify/functions/geocode?query=${encodeURIComponent(location)}`
                : `/.netlify/functions/geocode?query=${encodeURIComponent(location)}`;

            const response = await fetch(functionUrl);

            if (response.status === 429) {
                console.warn('Rate limited');
                return null;
            }

            if (!response.ok) {
                console.error('Geocode function error:', response.status);
                return null;
            }

            const results = await response.json();
            if (!results || results.length === 0) return null;

            const result = results[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                name: result.name
            };
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    async getRoute() {
        const modeMap = {
            'car': 'car',
            'foot': 'foot',
            'bike': 'bike'
        };

        const mode = modeMap[this.currentMode];

        try {
            const functionUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:8888/.netlify/functions/route'
                : '/.netlify/functions/route';

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startLon: this.startCoords.lon,
                    startLat: this.startCoords.lat,
                    endLon: this.endCoords.lon,
                    endLat: this.endCoords.lat,
                    mode: mode
                })
            });

            if (response.status === 429) {
                Notifications.showToast('⏳ Routing rate limited - please try again in a moment', 'warning', 3000);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Routing API error');
            }

            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
                throw new Error('No route found');
            }

            this.currentRoute = {
                start: this.startCoords,
                end: this.endCoords,
                startName: this.startName,
                endName: this.endName,
                mode: this.currentMode,
                route: data.routes[0],
                timestamp: Date.now()
            };

            this.displayRoute(data.routes[0]);
            this.showRouteInfo(data.routes[0]);
            Notifications.showToast('🛣️ Route found successfully!', 'success', 2000);

        } catch (error) {
            console.error('Route error:', error);
            Notifications.showModal(
                'Routing Failed',
                error.message || 'Could not calculate route. Please try different locations.',
                'error'
            );
        }
    }

    displayRoute(route) {
        this.clearMarkers();

        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
        }

        this.routeLayer = L.polyline(coordinates, {
            color: '#667eea',
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 5',
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(this.map);

        // Start marker
        const startMarker = L.marker(
            [this.startCoords.lat, this.startCoords.lon],
            {
                icon: L.icon({
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-blue.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                })
            }
        ).addTo(this.map).bindPopup(`<strong>A</strong><br>${this.startName}`);

        // End marker
        const endMarker = L.marker(
            [this.endCoords.lat, this.endCoords.lon],
            {
                icon: L.icon({
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-red.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                })
            }
        ).addTo(this.map).bindPopup(`<strong>B</strong><br>${this.endName}`);

        this.markers.push(startMarker, endMarker);

        const bounds = L.latLngBounds(
            [this.startCoords.lat, this.startCoords.lon],
            [this.endCoords.lat, this.endCoords.lon]
        );
        this.map.fitBounds(bounds, { padding: [100, 100] });
    }

    showRouteInfo(route) {
        const distance = (route.distance / 1000).toFixed(2);
        const durationMinutes = Math.round(route.duration / 60);

        document.getElementById('distance').textContent = `${distance} km`;
        document.getElementById('duration').textContent = `${durationMinutes} min`;
        
        const routeInfoDiv = document.getElementById('routeInfo');
        routeInfoDiv.style.display = 'block';
    }

    // =====================
    // FAVORITES MANAGEMENT
    // =====================
    saveFavorite() {
        if (!this.currentRoute) {
            Notifications.showModal(
                'No Route Found',
                'Please find a route first before saving.',
                'warning'
            );
            return;
        }

        const favorite = {
            id: this.currentRoute.timestamp,
            startName: this.currentRoute.startName,
            endName: this.currentRoute.endName,
            mode: this.currentRoute.mode,
            distance: (this.currentRoute.route.distance / 1000).toFixed(2),
            duration: Math.round(this.currentRoute.route.duration / 60),
            startCoords: this.currentRoute.start,
            endCoords: this.currentRoute.end
        };

        if (this.favorites.some(f => 
            f.startName === favorite.startName && 
            f.endName === favorite.endName &&
            f.mode === favorite.mode
        )) {
            Notifications.showToast('⭐ This route is already saved', 'info', 2000);
            return;
        }

        this.favorites.push(favorite);
        this.saveFavoritesToStorage();
        this.displayFavorites();
        Notifications.showToast('✅ Route saved successfully!', 'success', 2000);
    }

    loadFavorites() {
        const stored = localStorage.getItem('transitpalFavorites');
        this.favorites = stored ? JSON.parse(stored) : [];
        this.displayFavorites();
    }

    saveFavoritesToStorage() {
        localStorage.setItem('transitpalFavorites', JSON.stringify(this.favorites));
    }

    displayFavorites() {
        const list = document.getElementById('favoritesList');
        const count = document.getElementById('favoritesCount');
        const noData = document.getElementById('noFavorites');

        count.textContent = this.favorites.length;

        if (this.favorites.length === 0) {
            list.innerHTML = '';
            noData.style.display = 'flex';
            return;
        }

        noData.style.display = 'none';
        list.innerHTML = '';

        this.favorites.forEach(fav => {
            const modeEmoji = {
                'car': '🚗',
                'foot': '🚶',
                'bike': '🚴'
            };

            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.innerHTML = `
                <div class="favorite-info" style="flex: 1; cursor: pointer;">
                    <div class="favorite-name">${fav.startName} → ${fav.endName}</div>
                    <div class="favorite-mode">${modeEmoji[fav.mode]} ${fav.distance}km • ${fav.duration}min</div>
                </div>
                <button class="favorite-delete">×</button>
            `;

            item.querySelector('.favorite-info').addEventListener('click', () => {
                document.getElementById('startPoint').value = fav.startName;
                document.getElementById('endPoint').value = fav.endName;
                
                document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelector(`[data-mode="${fav.mode}"]`).classList.add('active');
                this.currentMode = fav.mode;
                document.getElementById('routeMode').value = this.currentMode;

                this.startCoords = fav.startCoords;
                this.endCoords = fav.endCoords;
                this.startName = fav.startName;
                this.endName = fav.endName;

                this.findRoute();
                Notifications.showToast('📍 Loaded favorite route', 'info', 2000);
            });

            item.querySelector('.favorite-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.favorites = this.favorites.filter(f => f.id !== fav.id);
                this.saveFavoritesToStorage();
                this.displayFavorites();
                Notifications.showToast('🗑️ Route deleted', 'info', 1500);
            });

            list.appendChild(item);
        });
    }

    // =====================
    // THEME MANAGEMENT
    // =====================
    toggleTheme() {
        const isDarkMode = !document.body.classList.contains('light-mode');
        
        if (isDarkMode) {
            document.body.classList.add('light-mode');
            localStorage.setItem('transitpal-theme', 'light');
            this.updateThemeIcon('light');
            Notifications.showToast('☀️ Light mode enabled', 'info', 1500);
        } else {
            document.body.classList.remove('light-mode');
            localStorage.setItem('transitpal-theme', 'dark');
            this.updateThemeIcon('dark');
            Notifications.showToast('🌙 Dark mode enabled', 'info', 1500);
        }
    }

    updateThemeIcon(theme) {
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            if (theme === 'light') {
                themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
                themeBtn.title = 'Switch to Dark Mode';
            } else {
                themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
                themeBtn.title = 'Switch to Light Mode';
            }
        }
    }

    loadThemePreference() {
        const savedTheme = localStorage.getItem('transitpal-theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            this.updateThemeIcon('light');
        } else {
            document.body.classList.remove('light-mode');
            this.updateThemeIcon('dark');
        }
    }

    // =====================
    // UTILITIES
    // =====================
    swapPoints() {
        const start = document.getElementById('startPoint').value;
        const end = document.getElementById('endPoint').value;

        document.getElementById('startPoint').value = end;
        document.getElementById('endPoint').value = start;
        
        Notifications.showToast('⇅ Start and destination swapped', 'info', 1500);
    }

    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            Notifications.showModal(
                'Geolocation Unavailable',
                'Your browser does not support geolocation.',
                'error'
            );
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.map.setView([latitude, longitude], 15);
                
                L.marker([latitude, longitude], {
                    icon: L.icon({
                        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                        iconSize: [25, 41]
                    })
                }).addTo(this.map).bindPopup('📍 You are here');
                
                Notifications.showToast('📍 Located your position', 'success', 2000);
            },
            (error) => {
                console.error('Geolocation error:', error);
                Notifications.showToast('❌ Could not get your location', 'error', 2000);
            }
        );
    }

    resetButton() {
        const findRouteBtn = document.getElementById('findRouteBtn');
        findRouteBtn.classList.remove('loading');
        findRouteBtn.disabled = false;
        findRouteBtn.innerHTML = '<i class="fas fa-compass"></i> Find Route';
    }
}

// =====================
// INITIALIZE ON PAGE LOAD
// =====================

document.addEventListener('DOMContentLoaded', () => {
    new TransitPal();
    console.log('TransitPal initialized with theme support');
});