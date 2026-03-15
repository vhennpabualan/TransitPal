# 🚌 TransitPal - Local Commuter Guide

A free, open-source Transit Route Mapper for your local city. Find routes, save favorites, and navigate using completely free APIs with **zero API keys required**.

## ✨ Features

- 🗺️ **Interactive Map Display** - Leaflet.js + OpenStreetMap
- 🔍 **Location Search** - Search any place by name using Nominatim
- 🛣️ **Route Finding** - Get directions between two points (driving, walking, cycling)
- 📍 **Multiple Travel Modes** - Car, walking, and bicycle routes
- 💾 **Save Favorites** - Store your frequently used routes locally
- 📊 **Route Information** - See distance and estimated travel time
- 📱 **Responsive Design** - Works on desktop and mobile

## 🛠️ Tech Stack

| Purpose | Technology | Cost | API Key |
|---------|-----------|------|---------|
| Map Display | Leaflet.js | Free | ❌ |
| Map Tiles | OpenStreetMap | Free | ❌ |
| Routing | OSRM | Free | ❌ |
| Geocoding | Nominatim | Free | ❌ |
| Storage | localStorage | Free | ❌ |

**Total setup cost: $0 (completely free)**

## 🚀 Getting Started

### Quick Start
1. Clone or download this project
2. Open `index.html` in your web browser
3. Start searching for locations and planning routes!

### No Installation Needed
- No backend server required
- No database setup
- No API key registration
- Works entirely in the browser
- Can be deployed on GitHub Pages for free

## 📖 How to Use

### 1. Search for a Location
- Type in the "Search Location" box
- Click on any result to view it on the map
- The map will automatically zoom to that location

### 2. Plan a Route
- Enter your starting point in "Starting point..."
- Enter your destination in "Destination..."
- Select your travel mode (🚗 Driving, 🚶 Walking, 🚴 Cycling)
- Click "Find Route"
- You'll see:
  - The route drawn on the map (blue dashed line)
  - Start point marker (blue - A)
  - End point marker (red - B)
  - Distance in kilometers
  - Estimated travel time in minutes

### 3. Swap Points
- Click the ⇅ button to quickly swap your starting point and destination

### 4. Save Your Favorite Routes
- After planning a route, click 💾 Save Route
- Your route is saved to localStorage (your browser)
- Access saved routes anytime from the "Saved Routes" section
- Click a saved route to reload it instantly
- Delete routes by clicking the × button

## 🌍 APIs Used

### 1. Leaflet.js
- **What**: JavaScript library for interactive maps
- **Why**: Lightweight, open-source, very beginner-friendly
- **Documentation**: https://leafletjs.com/

### 2. OpenStreetMap
- **What**: Free map tiles
- **Why**: Community-maintained, global coverage, always free
- **Attribution**: Required (included in the footer)

### 3. OSRM (Open Source Routing Machine)
- **What**: Routing engine for directions
- **Why**: Supports multiple modes (car, bike, foot), fast responses
- **Modes Supported**: 
  - `car` (driving)
  - `bike` (cycling)
  - `foot` (walking)
- **API Endpoint**: `https://router.project-osrm.org/`

### 4. Nominatim
- **What**: Geocoding service (place name → coordinates)
- **Why**: OpenStreetMap's official geocoder, no API key needed
- **Usage**: Search locations and get their coordinates
- **API Endpoint**: `https://nominatim.openstreetmap.org/`

## 💾 Data Storage

All your saved routes are stored in your browser's **localStorage**. This means:
- ✅ Instant access to saved routes
- ✅ No server needed
- ✅ 100% privacy (data stays on your device)
- ⚠️ Data is cleared if browser cache is cleared
- ⚠️ Not shared between browsers/devices

To export your routes, use browser DevTools:
```javascript
// In browser console
JSON.parse(localStorage.getItem('transitpalFavorites'))
```

## 🔧 Customization

### Change Default Location
In `app.js`, find this line and update coordinates:
```javascript
this.map = L.map('map').setView([7.0707, 125.6087], 13); // Davao City
```

Change `[7.0707, 125.6087]` to your city's coordinates (latitude, longitude).

### Change Color Scheme
In `styles.css`, update these colors:
```css
/* Purple gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Add More Features
The code is modular—you can add:
- Weather information
- Real-time transit info
- Nearby amenities (restaurants, stations, etc.)
- Photo sharing
- Route statistics

## 📱 Responsive Design

The app automatically adapts to different screen sizes:
- **Desktop**: Side-by-side layout (map + sidebar)
- **Tablet**: Responsive sidebar
- **Mobile**: Stacked layout (sidebar below map)

## 🐛 Troubleshooting

### "Could not find location"
- Try a more specific name or address
- Search includes the entire address, not just the place name

### Route not showing
- Ensure OSRM can reach both points
- Try with simpler location names
- Check your internet connection

### Markers not visible
- Try scrolling the map or changing the zoom level
- Fit bounds should auto-center (based on route)

### Saved routes disappeared
- Browser cookies/cache were cleared
- Try a different browser if data is critical
- Consider exporting important routes via console

## 🌐 Deploy to the Web

### GitHub Pages (Free)
1. Create a GitHub repository
2. Add your files
3. Go to Settings → Pages
4. Select "Deploy from a branch" (main)
5. Your site is live at `https://yourusername.github.io/transitpal`

### Netlify (Free)
1. Push to GitHub
2. Connect your repo to Netlify
3. Auto-deployment on every push

### Vercel (Free)
1. Same as Netlify

## 📊 Rate Limits

- **OSRM**: ~unlimited for small projects
- **Nominatim**: ~1 request/second (comfortable for most use cases)
- **OpenStreetMap**: Standard tile limits

For production with high traffic, consider self-hosting these services.

## 📝 Code Structure

```
TransitPal/
├── index.html      # Main HTML structure
├── styles.css      # Styling & responsive design
├── app.js          # Core logic (TransitPal class)
└── README.md       # This file
```

## 🤝 Contributing

Feel free to:
- Submit bug reports
- Suggest features
- Create pull requests
- Improve documentation

## 📄 License

This project is open source and free to use, modify, and distribute.

## 🎯 Future Enhancements

- Real-time transit schedules
- Integration with local bus/jeepney routes
- Offline map support
- Route history tracking
- Multi-stop journeys
- Integration with ride-sharing apps
- Voice navigation

## 💡 Tips for Success

1. **Bookmark this site** for quick access
2. **Share your favorite routes** with others
3. **Use search autocomplete** for efficiency
4. **Export routes** before clearing browser data
5. **Test with familiar places** first

---

**Happy commuting! 🚌**

For questions or issues, feel free to reach out!
