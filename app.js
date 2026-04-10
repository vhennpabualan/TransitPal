class Notifications {
    static showModal(title, message, type = 'error') {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; backdrop-filter: blur(4px);
        `;

        const iconMap = { error: '❌', success: '✅', warning: '⚠️', info: 'ℹ️' };
        const colorMap = { error: '#ff3b30', success: '#34c759', warning: '#ff9500', info: '#007aff' };

        overlay.innerHTML = `
            <div style="
                background: var(--bg-floating, #1c1c1e);
                border-radius: 20px;
                padding: 28px 24px 20px;
                max-width: 340px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.08);
                text-align: center;
                font-family: inherit;
            ">
                <div style="font-size: 2rem; margin-bottom: 12px;">${iconMap[type]}</div>
                <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 10px; color: var(--text-primary, #fff);">${title}</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary, rgba(255,255,255,0.6)); margin-bottom: 20px; line-height: 1.5;">${message}</div>
                <button onclick="this.closest('.modal-overlay').remove()" style="
                    width: 100%; height: 44px; border-radius: 12px; border: none;
                    background: ${colorMap[type]}; color: white;
                    font-family: inherit; font-size: 1rem; font-weight: 600; cursor: pointer;
                ">OK</button>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        if (type !== 'error') {
            setTimeout(() => overlay.parentElement && overlay.remove(), 5000);
        }
    }

    static showToast(message, type = 'info', duration = 3000) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed; top: 160px; left: 50%; transform: translateX(-50%);
                z-index: 9999; display: flex; flex-direction: column; gap: 8px;
                pointer-events: none; width: 90%; max-width: 400px;
            `;
            document.body.appendChild(container);
        }

        const colorMap = { error: '#ff3b30', success: '#34c759', warning: '#ff9500', info: '#007aff' };

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: var(--bg-floating, #1c1c1e);
            border-left: 3px solid ${colorMap[type]};
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--text-primary, #fff);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            pointer-events: all;
            cursor: pointer;
            animation: toastIn 0.3s ease;
            font-family: inherit;
        `;
        toast.textContent = message;
        toast.addEventListener('click', () => toast.remove());

        container.appendChild(toast);
        setTimeout(() => toast.parentElement && toast.remove(), duration);
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

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
        this.lastSearchTime = 0;
        this.lastRouteTime = 0;
        this.favorites = [];

        this.init();
    }

    init() {
        this.loadThemePreference();
        this.initMap();
        this.loadFavorites();
        this.attachEventListeners();
    }

    // =====================
    // MAP
    // =====================

    initMap() {
        this.map = L.map('map', { zoomControl: false }).setView([8.4866, 124.6648], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        this.map.attributionControl.setPrefix('');
    }

    // =====================
    // EVENTS
    // =====================

    attachEventListeners() {
        // Theme
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

        // Search (debounced)
        const debouncedSearch = debounce(v => this.handleSearch(v), 500);
        document.getElementById('searchInput')?.addEventListener('input', e => debouncedSearch(e.target.value));

        // Route
        document.getElementById('findRouteBtn')?.addEventListener('click', () => this.findRoute());

        // Bottom sheet click to show (when hidden)
        document.getElementById('routeSheet')?.addEventListener('click', (e) => {
            const sheet = document.getElementById('routeSheet');
            if (sheet.classList.contains('hidden')) {
                this.showBottomSheet();
            }
        });

        // Sheet trigger button click
        document.getElementById('sheetTriggerBtn')?.addEventListener('click', () => {
            this.showBottomSheet();
        });

        // Swap
        document.getElementById('swapBtn')?.addEventListener('click', () => this.swapPoints());

        // Route FAB scroll
        document.getElementById('routeFab')?.addEventListener('click', () => {
            document.getElementById('routeSheet')?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => document.getElementById('startPoint')?.focus(), 300);
        });

        // Save favorite
        document.getElementById('saveFavoriteBtn')?.addEventListener('click', () => this.saveFavorite());

        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentMode = e.currentTarget.dataset.mode;
                Notifications.showToast(`Mode: ${e.currentTarget.textContent.trim()}`, 'info', 1500);
            });
        });

        // Map controls
        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.map.zoomIn());
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.map.zoomOut());
        document.getElementById('locateBtn')?.addEventListener('click', () => this.getCurrentLocation());

        // Enter key on inputs
        document.getElementById('startPoint')?.addEventListener('keypress', e => { if (e.key === 'Enter') this.findRoute(); });
        document.getElementById('endPoint')?.addEventListener('keypress', e => { if (e.key === 'Enter') this.findRoute(); });
    }

    // =====================
    // SEARCH (direct Nominatim)
    // =====================

    async handleSearch(query) {
        const resultsDiv = document.getElementById('searchResults');
        if (query.length < 3) { resultsDiv.innerHTML = ''; return; }

        const now = Date.now();
        if (now - this.lastSearchTime < 1000) return;
        this.lastSearchTime = now;

        try {
            const results = await this.nominatimSearch(query);
            resultsDiv.innerHTML = '';

            if (!results.length) {
                resultsDiv.innerHTML = '<div style="padding:12px;color:var(--text-tertiary);text-align:center;font-size:0.85em;">No results found</div>';
                return;
            }

            results.forEach(r => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `<strong>${r.name || r.display_name.split(',')[0]}</strong><small>${r.display_name}</small>`;
                item.addEventListener('click', () => {
                    this.selectLocation(parseFloat(r.lat), parseFloat(r.lon), r.name || r.display_name.split(',')[0]);
                    resultsDiv.innerHTML = '';
                    document.getElementById('searchInput').value = r.name || r.display_name.split(',')[0];
                    Notifications.showToast(`📍 ${r.name || r.display_name.split(',')[0]}`, 'success', 2000);
                });
                resultsDiv.appendChild(item);
            });
        } catch (err) {
            console.error('Search error:', err);
            resultsDiv.innerHTML = '<div style="padding:12px;color:var(--text-tertiary);text-align:center;font-size:0.85em;">Search failed — check connection</div>';
        }
    }

    async nominatimSearch(query) {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        if (!res.ok) throw new Error(`Nominatim ${res.status}`);
        return res.json();
    }

    selectLocation(lat, lon, name) {
        this.clearMarkers();
        const marker = L.marker([lat, lon])
            .addTo(this.map)
            .bindPopup(`<strong>${name}</strong>`)
            .openPopup();
        this.markers.push(marker);
        this.map.setView([lat, lon], 15);
    }

    // =====================
    // ROUTE (direct OSRM)
    // =====================

    async findRoute() {
        const startInput = document.getElementById('startPoint').value.trim();
        const endInput = document.getElementById('endPoint').value.trim();

        if (!startInput || !endInput) {
            Notifications.showModal('Missing Information', 'Please enter both a starting point and destination.', 'warning');
            return;
        }

        const now = Date.now();
        if (now - this.lastRouteTime < 2000) {
            Notifications.showToast('⏳ Please wait a moment before searching again', 'warning', 2000);
            return;
        }
        this.lastRouteTime = now;

        this.setButtonLoading(true);

        try {
            // Geocode both points
            const [startGeo, endGeo] = await Promise.all([
                this.geocode(startInput),
                this.geocode(endInput)
            ]);

            if (!startGeo) {
                Notifications.showModal('Not Found', `Could not locate: "${startInput}"`, 'error');
                return;
            }
            if (!endGeo) {
                Notifications.showModal('Not Found', `Could not locate: "${endInput}"`, 'error');
                return;
            }

            this.startCoords = startGeo;
            this.endCoords = endGeo;
            this.startName = startInput;
            this.endName = endInput;

            await this.getRoute();

        } catch (err) {
            console.error('Route error:', err);
            Notifications.showModal('Route Failed', 'Could not calculate route. Try different locations.', 'error');
        } finally {
            this.setButtonLoading(false);
        }
    }

    async geocode(location) {
        try {
            const results = await this.nominatimSearch(location);
            if (!results.length) return null;
            return {
                lat: parseFloat(results[0].lat),
                lon: parseFloat(results[0].lon),
                name: results[0].display_name.split(',')[0]
            };
        } catch (err) {
            console.error('Geocode error:', err);
            return null;
        }
    }

    async getRoute() {
        // OSRM profile mapping
        const profileMap = { car: 'driving', foot: 'walking', bike: 'cycling' };
        const profile = profileMap[this.currentMode] || 'driving';

        const url = `https://router.project-osrm.org/route/v1/${profile}/` +
            `${this.startCoords.lon},${this.startCoords.lat};` +
            `${this.endCoords.lon},${this.endCoords.lat}` +
            `?overview=full&geometries=geojson`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`OSRM error ${res.status}`);
        const data = await res.json();

        if (!data.routes?.length) throw new Error('No route found');

        const route = data.routes[0];

        this.currentRoute = {
            start: this.startCoords,
            end: this.endCoords,
            startName: this.startName,
            endName: this.endName,
            mode: this.currentMode,
            route,
            timestamp: Date.now()
        };

        this.displayRoute(route);
        this.showRouteInfo(route);
        this.hideBottomSheet();
        Notifications.showToast('🛣️ Route found!', 'success', 2000);
    }

    hideBottomSheet() {
        const sheet = document.getElementById('routeSheet');
        const triggerBtn = document.getElementById('sheetTriggerBtn');
        if (sheet) {
            sheet.classList.add('hidden');
        }
        if (triggerBtn) {
            triggerBtn.classList.add('visible');
        }
    }

    showBottomSheet() {
        const sheet = document.getElementById('routeSheet');
        const triggerBtn = document.getElementById('sheetTriggerBtn');
        if (sheet) {
            sheet.classList.remove('hidden');
        }
        if (triggerBtn) {
            triggerBtn.classList.remove('visible');
        }
    }

    displayRoute(route) {
        this.clearMarkers();

        if (this.routeLayer) this.map.removeLayer(this.routeLayer);

        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);

        this.routeLayer = L.polyline(coords, {
            color: '#007aff',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(this.map);

        // Custom colored circle markers for A and B
        const makeCircle = (latlng, color, label) =>
            L.circleMarker(latlng, {
                radius: 10,
                fillColor: color,
                color: '#fff',
                weight: 2.5,
                fillOpacity: 1
            }).addTo(this.map).bindPopup(`<strong>${label}</strong>`);

        const startMarker = makeCircle(
            [this.startCoords.lat, this.startCoords.lon],
            '#34c759',
            `A — ${this.startName}`
        );
        const endMarker = makeCircle(
            [this.endCoords.lat, this.endCoords.lon],
            '#ff3b30',
            `B — ${this.endName}`
        );

        this.markers.push(startMarker, endMarker);

        this.map.fitBounds(this.routeLayer.getBounds(), { padding: [80, 80] });
    }

    showRouteInfo(route) {
        const distance = (route.distance / 1000).toFixed(2);
        const mins = Math.round(route.duration / 60);

        document.getElementById('distance').textContent = `${distance} km`;
        document.getElementById('duration').textContent = `${mins} min`;

        const card = document.getElementById('routeInfo');
        if (card) card.classList.add('visible');
    }

    // =====================
    // FAVORITES
    // =====================

    saveFavorite() {
        if (!this.currentRoute) {
            Notifications.showModal('No Route', 'Find a route first before saving.', 'warning');
            return;
        }

        const fav = {
            id: this.currentRoute.timestamp,
            startName: this.currentRoute.startName,
            endName: this.currentRoute.endName,
            mode: this.currentRoute.mode,
            distance: (this.currentRoute.route.distance / 1000).toFixed(2),
            duration: Math.round(this.currentRoute.route.duration / 60),
            startCoords: this.currentRoute.start,
            endCoords: this.currentRoute.end
        };

        if (this.favorites.some(f => f.startName === fav.startName && f.endName === fav.endName && f.mode === fav.mode)) {
            Notifications.showToast('⭐ Already saved', 'info', 2000);
            return;
        }

        this.favorites.push(fav);
        this.saveFavoritesToStorage();
        this.displayFavorites();
        Notifications.showToast('✅ Route saved!', 'success', 2000);
    }

    loadFavorites() {
        try {
            const stored = localStorage.getItem('transitpalFavorites');
            this.favorites = stored ? JSON.parse(stored) : [];
        } catch { this.favorites = []; }
        this.displayFavorites();
    }

    saveFavoritesToStorage() {
        localStorage.setItem('transitpalFavorites', JSON.stringify(this.favorites));
    }

    displayFavorites() {
        const list = document.getElementById('favoritesList');
        const count = document.getElementById('favoritesCount');
        const noData = document.getElementById('noFavorites');

        if (count) count.textContent = this.favorites.length;
        if (!list) return;

        if (!this.favorites.length) {
            list.innerHTML = '';
            if (noData) noData.style.display = 'flex';
            return;
        }

        if (noData) noData.style.display = 'none';
        list.innerHTML = '';

        const modeEmoji = { car: '🚗', foot: '🚶', bike: '🚴' };

        this.favorites.forEach(fav => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.style.cssText = `
                display: flex; align-items: center; gap: 12px;
                padding: 12px 16px; border-bottom: 1px solid var(--separator);
                cursor: pointer;
            `;
            item.innerHTML = `
                <div style="flex:1">
                    <div style="font-weight:600;font-size:0.95rem;margin-bottom:4px;">
                        ${fav.startName} → ${fav.endName}
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);">
                        ${modeEmoji[fav.mode]} ${fav.distance} km • ${fav.duration} min
                    </div>
                </div>
                <button class="fav-delete" style="
                    width:28px;height:28px;border-radius:8px;border:none;
                    background:rgba(255,59,48,0.15);color:#ff3b30;
                    cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;
                ">×</button>
            `;

            item.querySelector('.fav-delete').addEventListener('click', e => {
                e.stopPropagation();
                this.favorites = this.favorites.filter(f => f.id !== fav.id);
                this.saveFavoritesToStorage();
                this.displayFavorites();
                Notifications.showToast('🗑️ Deleted', 'info', 1500);
            });

            item.addEventListener('click', () => {
                document.getElementById('startPoint').value = fav.startName;
                document.getElementById('endPoint').value = fav.endName;
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                document.querySelector(`[data-mode="${fav.mode}"]`)?.classList.add('active');
                this.currentMode = fav.mode;
                this.startCoords = fav.startCoords;
                this.endCoords = fav.endCoords;
                this.startName = fav.startName;
                this.endName = fav.endName;
                this.findRoute();
            });

            list.appendChild(item);
        });
    }

    // =====================
    // THEME
    // =====================

    toggleTheme() {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('transitpal-theme', isLight ? 'light' : 'dark');
        this.updateThemeIcon(isLight ? 'light' : 'dark');
        Notifications.showToast(isLight ? '☀️ Light mode' : '🌙 Dark mode', 'info', 1500);
    }

    updateThemeIcon(theme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        btn.innerHTML = theme === 'light'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }

    loadThemePreference() {
        const saved = localStorage.getItem('transitpal-theme');
        if (saved === 'light') {
            document.body.classList.add('light-mode');
            this.updateThemeIcon('light');
        } else {
            this.updateThemeIcon('dark');
        }
    }

    // =====================
    // UTILITIES
    // =====================

    swapPoints() {
        const s = document.getElementById('startPoint');
        const e = document.getElementById('endPoint');
        [s.value, e.value] = [e.value, s.value];
        Notifications.showToast('⇅ Swapped', 'info', 1500);
    }

    clearMarkers() {
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            Notifications.showModal('Unavailable', 'Geolocation is not supported by your browser.', 'error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                this.map.setView([latitude, longitude], 15);
                L.circleMarker([latitude, longitude], {
                    radius: 10, fillColor: '#007aff', color: '#fff',
                    weight: 3, fillOpacity: 1
                }).addTo(this.map).bindPopup('📍 You are here').openPopup();
                Notifications.showToast('📍 Located!', 'success', 2000);
            },
            () => Notifications.showToast('❌ Could not get location', 'error', 2000)
        );
    }

    setButtonLoading(loading) {
        const btn = document.getElementById('findRouteBtn');
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = loading ? 'Finding Route…' : 'Find Route';
    }
}

// =====================
// BOOT
// =====================

document.addEventListener('DOMContentLoaded', () => {
    new TransitPal();

    // Collapsible cards
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.collapsible-card');
            const body = document.getElementById(header.dataset.target);
            if (!card || !body) return;
            card.classList.toggle('collapsed');
            body.style.maxHeight = card.classList.contains('collapsed')
                ? '0'
                : body.scrollHeight + 'px';
        });
    });
});