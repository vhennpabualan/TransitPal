# 🔌 API Documentation & Reference

This guide explains how each free API is integrated into TransitPal.

---

## 📍 Nominatim (Geocoding)

**Purpose**: Convert place names to coordinates (and vice versa)

### How We Use It

Search for locations by typing in the search box:
```javascript
// User types "Davao City Hall"
// We send:
https://nominatim.openstreetmap.org/search?q=Davao+City+Hall&format=json&limit=5

// Response example:
{
  "place_id": 123456,
  "lat": "7.0706",
  "lon": "125.6089",
  "name": "Davao City Hall",
  "display_name": "Davao City Hall, Davao City, Davao, Mindanao, Philippines"
}
```

### Rate Limits
- **1 request/second** for automated access
- We add reasonable delays in the app
- Free tier is fine for personal/small projects

### Code Location
See `handleSearch()` method in `app.js`

---

## 🗺️ Leaflet.js + OpenStreetMap

**Purpose**: Display the interactive map with freely available tiles

### How We Use It

Display map centered on Davao City:
```javascript
// Initialize map
this.map = L.map('map').setView([7.0707, 125.6087], 13);

// Add OpenStreetMap tiles (100% free)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19
}).addTo(this.map);

// Add markers and lines
const marker = L.marker([lat, lon]).addTo(this.map);
const line = L.polyline(coordinates).addTo(this.map);
```

### CDN Links (No installation needed)
```html
<!-- CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<!-- JavaScript -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

### Why OpenStreetMap?
- **Free forever** (no API key limit)
- Community-maintained, global coverage
- Offline-friendly
- Better than commercial maps for many regions

### Documentation
- Leaflet: https://leafletjs.com/reference.html
- OpenStreetMap: https://www.openstreetmap.org/

---

## 🛣️ OSRM (Open Source Routing Machine)

**Purpose**: Calculate the best route between two points with distance and time estimates

### How We Use It

Get route when user clicks "Find Route":
```javascript
// User clicks "Find Route"
// Start: Davao City Hall [7.0706, 125.6089]
// End: Abreeza Mall [7.0520, 125.6450]
// Mode: driving (car)

// We send to OSRM:
https://router.project-osrm.org/route/v1/car/125.6089,7.0706;125.6450,7.0520?overview=full&geometries=geojson&steps=true

// Response includes:
{
  "routes": [{
    "geometry": {
      "type": "LineString",
      "coordinates": [[125.6089, 7.0706], [125.61, 7.071], ..., [125.6450, 7.0520]]
    },
    "distance": 8234,      // meters
    "duration": 587,       // seconds
    "legs": [...]
  }]
}

// We convert:
// Distance: 8234m → 8.23 km
// Duration: 587s → 9-10 minutes
```

### Travel Modes Available

| Mode | Value | Use Case |
|------|-------|----------|
| Driving | `car` | Cars, motorcycles, vans |
| Walking | `foot` | Pedestrians, accessibility |
| Cycling | `bike` | Bicycles, cycling commute |

```javascript
// Example for each mode:
1. Driving: https://router.project-osrm.org/route/v1/car/lon1,lat1;lon2,lat2
2. Walking: https://router.project-osrm.org/route/v1/foot/lon1,lat1;lon2,lat2
3. Cycling: https://router.project-osrm.org/route/v1/bike/lon1,lat1;lon2,lat2
```

### Rate Limits
- **Default**: ~unlimited for reasonable use
- **Limits kick in**: 10,000+ requests/hour
- For a personal app: you'll never hit limits

### Code Location
See `getRouteFromOSRM()` and `displayRoute()` methods in `app.js`

### Important Notes
⚠️ Public OSRM instance is rate-limited. For production:
- Host your own OSRM instance
- Use alternatives like OpenRouteService, Mapbox, etc.

---

## 💾 Browser localStorage

**Purpose**: Save favorite routes without a server/database

### How We Use It

Save routes locally:
```javascript
// JavaScript integration
const favorites = [
  {
    id: 1709472000000,
    startName: "Davao City Hall",
    endName: "Abreeza Mall",
    mode: "driving",
    distance: "8.23",
    duration: "10",
    startCoords: {lat: 7.0706, lon: 125.6089},
    endCoords: {lat: 7.0520, lon: 125.6450}
  }
];

// Save to browser
localStorage.setItem('transitpalFavorites', JSON.stringify(favorites));

// Retrieve
const saved = JSON.parse(localStorage.getItem('transitpalFavorites'));
```

### Storage Limits
| Browser | Limit |
|---------|-------|
| Chrome | 10 MB |
| Firefox | 10 MB |
| Safari | 5 MB |
| Edge | 10 MB |

Most users can save 100+ routes comfortably.

### Persistence
- ✅ Survives browser restart
- ❌ Cleared when cache is cleared
- ❌ Not synced across browsers/devices

### Code Location
See `saveFavorite()` and `loadFavorites()` methods in `app.js`

---

## 📊 API Comparison

| API | Pros | Cons | Limit | Cost |
|---|---|---|---|---|
| **Nominatim** | Free, accurate, no key | 1 req/sec | Hard: 429 errors | Free |
| **OSRM** | Free, fast, no key | Rate limits high traffic | ~10k/hour | Free |
| **OpenStreetMap** | Free, global, offline-able | Community-maintained | None | Free |
| **Leaflet** | Free, lightweight, popular | Needs Tile server | None | Free |

---

## 🔄 Data Flow Diagram

```
User Interface (HTML/CSS)
        ↓
    app.js (TransitPal class)
        ↓ search
    Nominatim API ← coordinates, place names
        ↓ geocode
    Map Display (Leaflet)
        ↓ render
    OpenStreetMap tiles
        ↓ route request
    OSRM API ↔ coordinates
        ↓ route geometry
    Display Route (polyline + markers)
        ↓ save
    localStorage (browser storage)
```

---

## ✅ Rate Limit Best Practices

### Nominatim
```javascript
// Add delay between requests (good practice)
await new Promise(resolve => setTimeout(resolve, 100));
fetch(url).then(...)
```

### OSRM
```javascript
// Don't send duplicate requests
// Cache results when possible
if (cachedRoute.exists) return cachedRoute;
```

### General
- Add request debouncing for search (wait for user to stop typing)
- Cache results in localStorage
- Show loading states to users

---

## 🛠️ Adding More APIs

### Example: Add Weather Info
```javascript
// Use Open-Meteo (free weather API, no key)
async getWeather(lat, lon) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`
  );
  return response.json();
}
```

### Example: Add Stop Search
```javascript
// Use Overpass API (OpenStreetMap data)
async searchBusStops(lat, lon, radius = 1000) {
  const query = `
    [bbox:${lat-0.01},${lon-0.01},${lat+0.01},${lon+0.01}];
    (node["highway"="bus_stop"];);
    out center;
  `;
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  });
  return response.json();
}
```

---

## 🔗 External Resources

- **Leaflet Docs**: https://leafletjs.com/
- **OSRM API**: https://router.project-osrm.org/
- **Nominatim API**: https://nominatim.org/
- **OpenStreetMap**: https://www.openstreetmap.org/
- **Alternative APIs**: 
  - OpenRouteService: https://openrouteservice.org/
  - OpenTripPlanner: https://www.opentripplanner.org/
  - GraphHopper: https://graphhopper.com/

---

**Last Updated**: March 15, 2026
