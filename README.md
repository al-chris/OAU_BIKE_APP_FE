# OAU Campus Bike Visibility App - Frontend

![LOGO](logo.png)

A mobile-first Progressive Web App (PWA) providing real-time location visibility for campus bike transportation at Obafemi Awolowo University (OAU). Built with vanilla HTML, CSS, and JavaScript for maximum compatibility and performance.

## 🚨 Important Safety Notice

This application provides **location visibility ONLY**. It is **NOT** a ride-matching or booking service. Users are 100% responsible for their safety and transportation decisions.

## ✨ Features

### Core Functionality
- 📍 **Real-time Location Sharing**: GPS-based location tracking
- 🗺️ **Interactive Campus Map**: Leaflet-based map with OAU landmarks
- 👥 **Live User Visibility**: See active drivers and passengers
- 🚲 **Bike Availability Reporting**: Community-driven availability updates
- 🚨 **Emergency Alert System**: One-tap emergency notifications
- 📱 **Progressive Web App**: Installable, works offline

### Safety Features
- ⚠️ **Mandatory Safety Disclaimers**: Shown on every app launch
- 🚨 **Always-Visible Emergency Button**: Quick access to help
- 🔒 **Privacy by Design**: Session-based, no persistent accounts
- 🎯 **Campus Geofencing**: Only works within OAU boundaries
- 📞 **Emergency Contact Integration**: Automatic authority notification

### Technical Features
- 📱 **100% Mobile Responsive**: Optimized for all screen sizes
- 🌐 **Offline Support**: Works without internet connection
- 🔄 **Real-time Updates**: WebSocket-based live data
- 💾 **Data Synchronization**: Automatic sync when back online
- 🎨 **OAU Brand Compliant**: Follows official design guidelines

## 🎨 Design System

### Brand Colors
- **Campus Green**: `#2E7D32` - Primary brand color
- **Safety Blue**: `#0277BD` - Trust and security
- **Caution Amber**: `#FF8F00` - Warnings and alerts
- **Emergency Red**: `#C62828` - Emergency situations only

### Typography
- **Font Family**: Roboto (Google Fonts)
- **Hierarchy**: Bold for headings, Regular for body text
- **Accessibility**: High contrast, large touch targets

## 🏗️ Architecture

```
frontend/
├── index.html             # Main app entry point
├── styles.css             # Core styling
├── app.js                 # Main application logic
├── sw.js                  # Service worker (offline support)
├── manifest.json          # PWA manifest
└── favicon/               # App icons for installation
```

## 📋 Prerequisites

- Modern web browser with:
  - JavaScript ES6+ support
  - WebSocket support
  - Service Worker support
  - Geolocation API support
- HTTPS connection (required for PWA features)
- Backend API running (see backend README)

## 🚀 Quick Start

### 1. Setup Files

```bash
# Clone or download the frontend files
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.json
└── icons/ (create directory for PWA icons)
```

### 2. Configure API Endpoint

Edit `app.js` and update the API configuration:

```javascript
this.config = {
    apiBaseUrl: 'https://your-backend-api.com/api',  // Update this
    wsBaseUrl: 'wss://your-backend-api.com/ws',      // Update this
    oauCenter: [7.5227, 4.5198],
    campusRadius: 5000,
    updateInterval: 30000,
};
```

### 3. Create PWA Icons

Create icons in `icons/` directory:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

### 4. Serve Files

**For Development:**
```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8080
```

**For Production:**
- Deploy to any static hosting service
- Ensure HTTPS is enabled
- Configure proper MIME types for `.json` and `.js` files

## 🌐 Deployment Options

### Netlify (Recommended)

1. Connect GitHub repository
2. Build settings: None (static files)
3. Publish directory: `/` (root)
4. Add environment redirects for SPA:

```toml
# netlify.toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel

```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ]
}
```

### GitHub Pages

1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source branch
4. Access via `https://al-chris.github.io/oau_bike_app_fe`

### Traditional Web Hosting

Upload files via FTP/SFTP to web server:
```bash
# Example structure on server
/public_html/
├── index.html
├── styles.css
├── app.js
└── ... (all other files)
```

## 📱 Progressive Web App Features

### Installation

Users can install the app:
- **Android**: "Add to Home Screen" prompt
- **iOS**: "Add to Home Screen" from Safari share menu
- **Desktop**: Install prompt in browser address bar

### Offline Functionality

The app works offline by:
- Caching static assets (HTML, CSS, JS)
- Storing location updates locally
- Queuing emergency alerts for sync
- Automatically syncing when back online

### App Shortcuts

Users can quick-access:
- Emergency Alert (direct to emergency function)
- Report Bikes (direct to availability reporting)

## 🗺️ Map Integration

### Leaflet Configuration

The app uses Leaflet with OpenStreetMap tiles:

```javascript
// Map initialization
this.map = L.map('map', {
    center: [7.5227, 4.5198],  // OAU Main Gate
    zoom: 16,
    minZoom: 14,
    maxZoom: 19
});

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(this.map);
```

### Campus Landmarks

Predefined OAU landmarks:
- Main Gate (7.5227, 4.5198)
- Student Union Building (7.5245, 4.5203)
- Mozambique Hostel (7.5280, 4.5167)
- Angola Hostel (7.5289, 4.5134)
- OAU Teaching Hospital (7.5345, 4.5123)
- Sports Complex (7.5198, 4.5234)

### Custom Markers

Different marker types:
- **User Location**: Large colored circle (green=driver, red=passenger)
- **Other Users**: Smaller circles with role icons
- **Landmarks**: Gray pins with building icons
- **Emergency**: Pulsing red circles with exclamation marks

## 🔧 Configuration

### Campus Boundaries

```javascript
// OAU campus configuration
oauCenter: [7.5227, 4.5198],    // Main Gate coordinates
campusRadius: 5000,              // 5km radius in meters
```

### Update Intervals

```javascript
updateInterval: 30000,           // 30 seconds for location updates
websocketPingInterval: 30000,    // WebSocket keepalive
```

### Rate Limiting

```javascript
locationUpdateLimit: 60,         // Max updates per minute
emergencyAlertLimit: 5,          // Max alerts per hour
```

## 🚨 Emergency System

### Emergency Button

Always-visible floating action button:
- **Position**: Bottom-right corner
- **Color**: Emergency red (#C62828)
- **Size**: 80px diameter (60px on mobile)
- **Icon**: Exclamation triangle

### Emergency Flow

1. **Tap Emergency Button** → Confirmation dialog
2. **Confirm Emergency** → Location captured
3. **Immediate Feedback** → "Alert Sent" confirmation
4. **Background Processing** → Authorities notified
5. **Nearby User Alert** → Anonymous safety advisory

### Emergency Contacts

Automatically contacts:
- Campus Security: +234-XXX-XXX-XXXX
- Student Union: +234-XXX-XXX-XXXX
- OAU Clinic: +234-XXX-XXX-XXXX
- User's Emergency Contact (if provided)

## 📱 Mobile Optimization

### Touch Targets

All interactive elements meet accessibility standards:
- **Minimum Size**: 44px × 44px
- **Spacing**: 8px minimum between targets
- **Feedback**: Visual feedback on touch

### Responsive Breakpoints

```css
/* Mobile First */
@media (max-width: 480px) { /* Small phones */ }
@media (max-width: 768px) { /* Tablets */ }
@media (max-width: 1024px) { /* Desktop */ }
```

### iOS Optimizations

```css
/* Handle iPhone notches and safe areas */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);

/* Prevent zoom on input focus */
input { font-size: 16px; }
```

## 🔒 Privacy & Security

### Data Collection

**Minimal Data Approach:**
- ✅ Current location (GPS coordinates)
- ✅ User role (driver/passenger)
- ✅ Emergency contact (optional, encrypted)
- ❌ NO personal information
- ❌ NO persistent user accounts
- ❌ NO tracking outside campus

### Session Management

- **Temporary Sessions**: Automatically expire after 4 hours
- **No Persistent Storage**: Optional role memory only
- **Clean Logout**: Complete data removal on session end

### Location Privacy

- **Campus Only**: Location sharing disabled outside OAU
- **Anonymized Display**: Users shown as anonymous markers
- **No History**: Location history not stored long-term

## 🧪 Testing

### Device Testing

Test on various devices:
- **iOS**: iPhone 8+ with Safari
- **Android**: Chrome, Samsung Internet
- **Desktop**: Chrome, Firefox, Safari, Edge

### Feature Testing

```javascript
// Test offline functionality
// 1. Load app online
// 2. Disconnect internet
// 3. Try to update location → should store locally
// 4. Reconnect → should auto-sync

// Test emergency system
// 1. Trigger emergency alert
// 2. Verify confirmation dialog
// 3. Check authorities notification
// 4. Confirm user feedback
```

### Browser Compatibility

**Required Features:**
- ES6 JavaScript support
- CSS Grid and Flexbox
- WebSocket API
- Service Workers
- Geolocation API
- IndexedDB

**Fallbacks:**
- Graceful degradation for older browsers
- Polyfills for missing features
- Alternative layouts for limited CSS support

## ⚡ Performance Optimization

### Loading Strategy

```html
<!-- Critical CSS inline -->
<style>/* Critical above-fold styles */</style>

<!-- Non-critical CSS async -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">

<!-- JavaScript async -->
<script src="app.js" defer></script>
```

### Image Optimization

```javascript
// Use appropriate image sizes
const iconSizes = {
    mobile: '24px',
    tablet: '32px', 
    desktop: '40px'
};
```

### Bundle Size

- **HTML**: ~15KB
- **CSS**: ~25KB
- **JavaScript**: ~35KB
- **Total**: ~75KB (without images)
- **With Service Worker**: ~95KB

## 🐛 Troubleshooting

### Common Issues

**Location Not Working:**
```javascript
// Check browser permissions
navigator.permissions.query({name: 'geolocation'})
    .then(result => console.log(result.state));

// Verify HTTPS connection
console.log(location.protocol); // Should be "https:"
```

**App Not Installing:**
```javascript
// Check PWA requirements
// 1. Served over HTTPS
// 2. Valid manifest.json
// 3. Service worker registered
// 4. At least 192px icon
```

**WebSocket Connection Fails:**
```javascript
// Check connection
const ws = new WebSocket('wss://your-api.com/ws/test');
ws.onopen = () => console.log('Connected');
ws.onerror = (error) => console.log('Error:', error);
```

### Debug Mode

```javascript
// Enable debug logging
localStorage.setItem('debug', 'true');

// View stored data
// Open DevTools → Application → IndexedDB → OAUBikeAppDB
```

## 📊 Analytics Integration

### User Metrics

Track key metrics:
- Session duration
- Feature usage
- Emergency alert frequency
- Location update frequency
- Offline usage patterns

### Performance Monitoring

```javascript
// Performance API
const navTiming = performance.getEntriesByType('navigation')[0];
console.log('Page load time:', navTiming.loadEventEnd - navTiming.fetchStart);

// Core Web Vitals
new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        console.log(entry.name, entry.value);
    }
}).observe({entryTypes: ['largest-contentful-paint', 'first-input', 'cumulative-layout-shift']});
```

## 🤝 Contributing

### Development Workflow

1. **Fork Repository**
2. **Create Feature Branch**: `git checkout -b feature/new-feature`
3. **Follow Code Standards**:
   - Use consistent indentation (2 spaces)
   - Add comments for complex logic
   - Test on multiple devices
4. **Test Thoroughly**
5. **Submit Pull Request**

### Code Standards

**HTML:**
- Semantic markup
- Accessibility attributes
- Valid HTML5

**CSS:**
- Mobile-first approach
- CSS custom properties (variables)
- Consistent naming (BEM methodology)

**JavaScript:**
- ES6+ features
- Async/await for promises
- Error handling for all operations
- Comments for complex functions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

**Technical Support:**
- Create GitHub issue for bugs
- Check browser console for errors
- Verify network connectivity

**Campus Integration:**
- Contact OAU IT Department
- Coordinate with Campus Security
- Student Union collaboration

**User Support:**
- In-app help documentation
- Safety guidelines
- Contact information for emergencies

## ⚠️ Disclaimer

This application provides location visibility ONLY. It is NOT a ride-matching service. Users are 100% responsible for their safety, transportation decisions, and interactions with other users. The app developers and OAU are not liable for any incidents during transportation.

## 🏆 Acknowledgments

- **OAU Community**: For inspiration and feedback
- **Leaflet**: Open-source mapping library
- **OpenStreetMap**: Free map data
- **Google Fonts**: Roboto typography
- **Font Awesome**: Icon library

---

**Built with 📱 for Mobile-First Experience**
**Date Created**: June 16, 2025
**Last Updated**: June 16, 2025
**Developer**: al-chris
**Platform**: Progressive Web App (PWA)