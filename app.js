// OAU Campus Bike Visibility App with Leaflet
class OAUBikeApp {
    constructor() {
        this.currentUser = null;
        this.map = null;
        this.userLocation = null;
        this.markers = new Map();
        this.userMarker = null;
        this.campusBoundary = null;
        this.websocket = null;
        this.sessionToken = null;
        this.locationWatcher = null;
        
        // Configuration
        this.config = {
            apiBaseUrl: 'https://oau-bike-app.onrender.com/api',
            wsBaseUrl: 'ws://oau-bike-app.onrender.com/ws',
            oauCenter: [7.5227, 4.5198], // [lat, lng] for Leaflet
            campusRadius: 5000, // meters
            updateInterval: 30000, // 30 seconds
            mapConfig: {
                minZoom: 14,
                maxZoom: 19,
                zoomControl: false, // We'll use custom controls
            }
        };
        
        // OAU Campus Landmarks
        this.landmarks = [
            { name: 'Main Gate', lat: 7.5227, lng: 4.5198, type: 'entrance' },
            { name: 'Student Union Building (SUB)', lat: 7.5245, lng: 4.5203, type: 'building' },
            { name: 'Oduduwa Hall', lat: 7.5234, lng: 4.5189, type: 'hall' },
            { name: 'Faculty of Technology', lat: 7.5256, lng: 4.5210, type: 'faculty' },
            { name: 'Science Complex', lat: 7.5240, lng: 4.5220, type: 'faculty' },
            { name: 'Arts Theatre', lat: 7.5230, lng: 4.5180, type: 'theatre' },
            { name: 'Mozambique Hostel', lat: 7.5280, lng: 4.5167, type: 'hostel' },
            { name: 'Angola Hostel', lat: 7.5289, lng: 4.5134, type: 'hostel' },
            { name: 'Madagascar Hostel', lat: 7.5295, lng: 4.5145, type: 'hostel' },
            { name: 'Awolowo Hall', lat: 7.5270, lng: 4.5150, type: 'hostel' },
            { name: 'Sports Complex', lat: 7.5198, lng: 4.5234, type: 'sports' },
            { name: 'OAU Teaching Hospital (OAUTHC)', lat: 7.5345, lng: 4.5123, type: 'hospital' },
            { name: 'Hezekiah Oluwasanmi Library', lat: 7.5250, lng: 4.5200, type: 'library' },
            { name: 'Back Gate', lat: 7.5320, lng: 4.5180, type: 'entrance' },
            { name: 'Cooperative Gate', lat: 7.5200, lng: 4.5280, type: 'entrance' },
            { name: 'Buka Junction', lat: 7.5260, lng: 4.5190, type: 'food' },
            { name: 'Banking Complex', lat: 7.5235, lng: 4.5195, type: 'service' },
            { name: 'Chapel of Wisdom', lat: 7.5225, lng: 4.5175, type: 'religious' }
        ];
        
        this.init();
    }
    
    async init() {
        try {
            // Show loading overlay
            this.showLoading();
            
            // Initialize event listeners
            this.initEventListeners();
            
            // Check for existing session
            const savedSession = localStorage.getItem('oau_bike_session');
            const savedRole = localStorage.getItem('oau_bike_role');
            
            if (savedSession && savedRole) {
                this.sessionToken = savedSession;
                this.currentUser = { role: savedRole };
                await this.initializeApp();
            } else {
                // Show disclaimer first
                this.showDisclaimer();
            }
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showToast('Failed to initialize app', 'error');
        }
    }
    
    // Keep all existing event listener methods unchanged
    initEventListeners() {
        // ... (all existing event listeners remain the same)
        // Disclaimer modal
        document.getElementById('acceptDisclaimer').addEventListener('click', () => {
            this.hideModal('disclaimerModal');
            this.showRoleSelection();
        });
        
        // Role selection
        document.getElementById('selectPassenger').addEventListener('click', () => {
            this.selectRole('passenger');
        });
        
        document.getElementById('selectDriver').addEventListener('click', () => {
            this.selectRole('driver');
        });
        
        // Role toggle
        document.getElementById('roleToggle').addEventListener('click', () => {
            this.toggleRole();
        });
        
        // Map controls
        document.getElementById('centerMap').addEventListener('click', () => {
            this.centerMapOnCampus();
        });
        
        document.getElementById('myLocation').addEventListener('click', () => {
            this.centerMapOnUser();
        });
        
        // Bike availability reporting
        document.querySelectorAll('.availability-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = e.currentTarget.dataset.level;
                this.reportBikeAvailability(level);
            });
        });
        
        // Emergency button
        document.getElementById('panicButton').addEventListener('click', () => {
            this.showModal('emergencyModal');
        });
        
        document.getElementById('confirmEmergency').addEventListener('click', () => {
            this.triggerEmergencyAlert();
        });
        
        document.getElementById('cancelEmergency').addEventListener('click', () => {
            this.hideModal('emergencyModal');
        });
        
        // Settings
        document.getElementById('settingsButton').addEventListener('click', () => {
            this.showSettings();
        });
        
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.hideModal('settingsModal');
        });
        
        document.getElementById('endSession').addEventListener('click', () => {
            this.endSession();
        });
        
        // Emergency contact saving
        document.getElementById('emergencyContact').addEventListener('blur', () => {
            this.saveEmergencyContact();
        });
        
        // Location sharing toggle
        document.getElementById('locationSharing').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startLocationTracking();
            } else {
                this.stopLocationTracking();
            }
        });
    }
    
    async initializeApp() {
        try {
            // Initialize Leaflet map
            await this.initLeafletMap();
            
            // Start location tracking
            await this.startLocationTracking();
            
            // Connect to WebSocket
            this.connectWebSocket();
            
            // Update UI
            this.updateRoleDisplay();
            this.updateConnectionStatus('connected');
            
            // Hide loading overlay
            this.hideLoading();
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            this.showToast('Connected to OAU Campus Bike Visibility', 'success');
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showToast('Failed to initialize app', 'error');
            this.hideLoading();
        }
    }
    
    async initLeafletMap() {
        return new Promise((resolve, reject) => {
            try {
                // Initialize Leaflet map
                this.map = L.map('map', {
                    center: this.config.oauCenter,
                    zoom: 16,
                    minZoom: this.config.mapConfig.minZoom,
                    maxZoom: this.config.mapConfig.maxZoom,
                    zoomControl: this.config.mapConfig.zoomControl,
                    attributionControl: true
                });
                
                // Add OpenStreetMap tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(this.map);
                
                // Add campus boundary circle
                this.campusBoundary = L.circle(this.config.oauCenter, {
                    color: '#2E7D32',
                    fillColor: '#2E7D32',
                    fillOpacity: 0.1,
                    radius: this.config.campusRadius,
                    weight: 2,
                    dashArray: '5, 5'
                }).addTo(this.map);
                
                // Add campus landmarks
                this.addCampusLandmarks();
                
                // Set up map bounds to OAU campus area
                const bounds = L.latLngBounds([
                    [this.config.oauCenter[0] - 0.05, this.config.oauCenter[1] - 0.05],
                    [this.config.oauCenter[0] + 0.05, this.config.oauCenter[1] + 0.05]
                ]);
                this.map.setMaxBounds(bounds);
                
                // Map ready
                this.map.whenReady(() => {
                    resolve();
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    addCampusLandmarks() {
        // Create custom landmark icon
        const landmarkIcon = L.divIcon({
            className: 'landmark-marker',
            html: '<i class="fas fa-map-marker-alt" style="color: #757575; font-size: 16px;"></i>',
            iconSize: [20, 20],
            iconAnchor: [10, 20],
            popupAnchor: [0, -20]
        });
        
        this.landmarks.forEach(landmark => {
            const marker = L.marker([landmark.lat, landmark.lng], {
                icon: landmarkIcon,
                title: landmark.name
            }).addTo(this.map);
            
            // Add popup with landmark info
            marker.bindPopup(`
                <div style="text-align: center; min-width: 150px;">
                    <strong>${landmark.name}</strong><br>
                    <small style="color: #757575;">${landmark.type}</small>
                </div>
            `);
        });
    }
    
    async startLocationTracking() {
        if (!navigator.geolocation) {
            this.showToast('Geolocation not supported', 'error');
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        };
        
        this.locationWatcher = navigator.geolocation.watchPosition(
            (position) => {
                this.handleLocationUpdate(position);
            },
            (error) => {
                console.error('Location error:', error);
                this.showToast('Location access denied', 'warning');
            },
            options
        );
    }
    
    async handleLocationUpdate(position) {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Check if location is within campus
        const distance = this.calculateDistance(
            latitude, longitude,
            this.config.oauCenter[0], this.config.oauCenter[1]
        );
        
        if (distance > this.config.campusRadius / 1000) {
            this.showToast('You are outside OAU campus boundaries', 'warning');
            return;
        }
        
        this.userLocation = [latitude, longitude];
        
        // Update location display
        this.updateLocationDisplay(latitude, longitude);
        
        // Send location to backend
        await this.sendLocationUpdate(latitude, longitude, accuracy);
        
        // Update user marker on map
        this.updateUserMarker(latitude, longitude);
    }
    
    updateUserMarker(latitude, longitude) {
        const position = [latitude, longitude];
        const isDriver = this.currentUser.role === 'driver';
        const color = isDriver ? '#2E7D32' : '#C62828';
        const iconClass = isDriver ? 'fa-motorcycle' : 'fa-user';
        
        // Create custom user marker
        const userIcon = L.divIcon({
            className: 'user-marker',
            html: `
                <div style="
                    width: 24px; 
                    height: 24px; 
                    background: ${color}; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">
                    <i class="fas ${iconClass}" style="color: white; font-size: 10px;"></i>
                </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        if (this.userMarker) {
            this.userMarker.setLatLng(position);
            this.userMarker.setIcon(userIcon);
        } else {
            this.userMarker = L.marker(position, {
                icon: userIcon,
                title: 'Your Location',
                zIndexOffset: 1000
            }).addTo(this.map);
            
            this.userMarker.bindPopup(`
                <div style="text-align: center;">
                    <strong>Your Location</strong><br>
                    <small>Role: ${this.currentUser.role}</small>
                </div>
            `);
        }
    }
    
    updateOtherUserMarker(data) {
        const { session_id, role, latitude, longitude } = data;
        
        // Don't show our own marker
        if (session_id === this.extractSessionId(this.sessionToken)) {
            return;
        }
        
        const position = [latitude, longitude];
        const isDriver = role === 'driver';
        const color = isDriver ? '#2E7D32' : '#C62828';
        const iconClass = isDriver ? 'fa-motorcycle' : 'fa-user';
        
        // Create marker icon
        const otherUserIcon = L.divIcon({
            className: 'other-user-marker',
            html: `
                <div style="
                    width: 20px; 
                    height: 20px; 
                    background: ${color}; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                ">
                    <i class="fas ${iconClass}" style="color: white; font-size: 8px;"></i>
                </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        if (this.markers.has(session_id)) {
            this.markers.get(session_id).setLatLng(position);
            this.markers.get(session_id).setIcon(otherUserIcon);
        } else {
            const marker = L.marker(position, {
                icon: otherUserIcon,
                title: `${role} (Anonymous)`
            }).addTo(this.map);
            
            marker.bindPopup(`
                <div style="text-align: center;">
                    <strong>${role}</strong><br>
                    <small>Anonymous User</small><br>
                    <small style="color: #757575;">Last seen: ${new Date().toLocaleTimeString()}</small>
                </div>
            `);
            
            this.markers.set(session_id, marker);
        }
        
        // Update activity stats
        this.updateActivityStats();
    }
    
    handleEmergencyAlert(data) {
        const { alert_type, latitude, longitude, landmark, timestamp } = data;
        
        // Show emergency notification
        this.showToast(`Emergency Alert: ${alert_type} near ${landmark}`, 'error');
        
        // Create emergency marker icon
        const emergencyIcon = L.divIcon({
            className: 'emergency-marker',
            html: `
                <div style="
                    width: 30px; 
                    height: 30px; 
                    background: #C62828; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(198, 40, 40, 0.5);
                    animation: pulse 2s infinite;
                ">
                    <i class="fas fa-exclamation" style="color: white; font-size: 16px; font-weight: bold;"></i>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        // Add emergency marker to map
        const emergencyMarker = L.marker([latitude, longitude], {
            icon: emergencyIcon,
            title: `Emergency: ${alert_type}`,
            zIndexOffset: 2000
        }).addTo(this.map);
        
        emergencyMarker.bindPopup(`
            <div style="text-align: center; color: #C62828;">
                <strong>🚨 EMERGENCY ALERT</strong><br>
                <strong>Type:</strong> ${alert_type}<br>
                <strong>Location:</strong> ${landmark}<br>
                <small>Time: ${new Date(timestamp).toLocaleTimeString()}</small>
            </div>
        `);
        
        // Open popup immediately
        emergencyMarker.openPopup();
        
        // Center map on emergency location
        this.map.setView([latitude, longitude], 17);
        
        // Remove emergency marker after 5 minutes
        setTimeout(() => {
            this.map.removeLayer(emergencyMarker);
        }, 300000);
    }
    
    centerMapOnCampus() {
        if (this.map) {
            this.map.setView(this.config.oauCenter, 16);
        }
    }
    
    centerMapOnUser() {
        if (this.map && this.userLocation) {
            this.map.setView(this.userLocation, 18);
        } else {
            this.showToast('User location not available', 'warning');
        }
    }
    
    // Keep all other existing methods unchanged
    async selectRole(role) {
        try {
            const rememberChoice = document.getElementById('rememberRole').checked;
            
            // Create session with backend
            const response = await fetch(`${this.config.apiBaseUrl}/auth/create-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role: role,
                    emergency_contact: localStorage.getItem('emergency_contact') || null
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create session');
            }
            
            const sessionData = await response.json();
            this.sessionToken = sessionData.access_token;
            this.currentUser = { role: role };
            
            // Save session data
            localStorage.setItem('oau_bike_session', this.sessionToken);
            if (rememberChoice) {
                localStorage.setItem('oau_bike_role', role);
            }
            
            this.hideModal('roleModal');
            await this.initializeApp();
            
        } catch (error) {
            console.error('Role selection failed:', error);
            this.showToast('Failed to create session', 'error');
        }
    }
    
    // ... (keep all other existing methods like sendLocationUpdate, reportBikeAvailability, 
    // triggerEmergencyAlert, connectWebSocket, handleWebSocketMessage, toggleRole, 
    // updateRoleDisplay, updateConnectionStatus, updateLocationDisplay, findNearestLandmark,
    // calculateDistance, updateActivityStats, startPeriodicUpdates, showSettings, 
    // saveEmergencyContact, endSession, utility methods, etc.)
    
    async sendLocationUpdate(latitude, longitude, accuracy) {
        if (!this.sessionToken) return;
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/location/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    latitude,
                    longitude,
                    accuracy,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update location');
            }
            
        } catch (error) {
            console.error('Location update failed:', error);
        }
    }
    
    connectWebSocket() {
        if (!this.sessionToken) return;
        
        const sessionId = this.extractSessionId(this.sessionToken);
        const wsUrl = `${this.config.wsBaseUrl}/${sessionId}`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.updateConnectionStatus('connected');
        };
        
        this.websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateConnectionStatus('disconnected');
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.connectWebSocket(), 5000);
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('error');
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'location_update':
                this.updateOtherUserMarker(data);
                break;
            case 'emergency_alert':
                this.handleEmergencyAlert(data);
                break;
            case 'heartbeat':
                // Keep connection alive
                break;
            default:
                console.log('Unknown WebSocket message:', data);
        }
    }
    
    async reportBikeAvailability(level) {
        if (!this.userLocation || !this.sessionToken) {
            this.showToast('Location required to report bike availability', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/location/bike-availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    latitude: this.userLocation[0],
                    longitude: this.userLocation[1],
                    availability: level
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to report bike availability');
            }
            
            // Update UI
            document.querySelectorAll('.availability-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-level="${level}"]`).classList.add('active');
            
            this.showToast(`Bike availability reported: ${level}`, 'success');
            
        } catch (error) {
            console.error('Bike availability report failed:', error);
            this.showToast('Failed to report bike availability', 'error');
        }
    }
    
    async triggerEmergencyAlert() {
        if (!this.userLocation || !this.sessionToken) {
            this.showToast('Location required for emergency alert', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/emergency/alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    latitude: this.userLocation[0],
                    longitude: this.userLocation[1],
                    alert_type: 'panic',
                    message: 'Emergency alert triggered from OAU Campus Bike App'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send emergency alert');
            }
            
            this.hideModal('emergencyModal');
            this.showToast('Emergency alert sent! Authorities notified.', 'success');
            
            // Show emergency confirmation
            this.showEmergencyConfirmation();
            
        } catch (error) {
            console.error('Emergency alert failed:', error);
            this.showToast('Failed to send emergency alert', 'error');
        }
    }
    
    showEmergencyConfirmation() {
        const confirmationHtml = `
            <div class="emergency-confirmation">
                <i class="fas fa-check-circle" style="color: #4CAF50; font-size: 48px; margin-bottom: 16px;"></i>
                <h3>Emergency Alert Sent</h3>
                <p>Campus Security and your emergency contacts have been notified.</p>
                <p><strong>Help is on the way!</strong></p>
                <div style="margin-top: 20px;">
                    <p><strong>Emergency Contacts:</strong></p>
                    <p>Campus Security: ${this.config.emergencyContacts?.security || '+234-XXX-XXX-XXXX'}</p>
                    <p>Student Union: ${this.config.emergencyContacts?.union || '+234-XXX-XXX-XXXX'}</p>
                </div>
            </div>
        `;
        
        // Create temporary modal for confirmation
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                ${confirmationHtml}
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-check"></i> OK
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }
    
    async toggleRole() {
        const newRole = this.currentUser.role === 'driver' ? 'passenger' : 'driver';
        
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/auth/switch-role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({ new_role: newRole })
            });
            
            if (!response.ok) {
                throw new Error('Failed to switch role');
            }
            
            this.currentUser.role = newRole;
            localStorage.setItem('oau_bike_role', newRole);
            this.updateRoleDisplay();
            
            // Update user marker color
            if (this.userMarker && this.userLocation) {
                this.updateUserMarker(this.userLocation[0], this.userLocation[1]);
            }
            
            this.showToast(`Switched to ${newRole}`, 'success');
            
        } catch (error) {
            console.error('Role toggle failed:', error);
            this.showToast('Failed to switch role', 'error');
        }
    }
    
    updateRoleDisplay() {
        const roleIcon = document.getElementById('roleIcon');
        const roleText = document.getElementById('currentRole');
        
        if (this.currentUser.role === 'driver') {
            roleIcon.className = 'fas fa-motorcycle';
            roleText.textContent = 'Driver';
        } else {
            roleIcon.className = 'fas fa-user';
            roleText.textContent = 'Passenger';
        }
    }
    
    updateConnectionStatus(status) {
        const statusDot = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        statusDot.className = `status-dot ${status}`;
        
        switch (status) {
            case 'connected':
                statusText.textContent = 'Connected';
                break;
            case 'disconnected':
                statusText.textContent = 'Disconnected';
                break;
            case 'error':
                statusText.textContent = 'Connection Error';
                break;
            default:
                statusText.textContent = 'Connecting...';
        }
    }
    
    updateLocationDisplay(latitude, longitude) {
        const locationElement = document.getElementById('currentLocation');
        const landmarkElement = document.getElementById('nearestLandmark');
        
        locationElement.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        
        // Find nearest landmark
        const landmark = this.findNearestLandmark(latitude, longitude);
        landmarkElement.textContent = landmark ? `Near ${landmark}` : '';
    }
    
    findNearestLandmark(lat, lng) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.landmarks.forEach(landmark => {
            const distance = this.calculateDistance(lat, lng, landmark.lat, landmark.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = landmark.name;
            }
        });
        
        return minDistance < 0.5 ? nearest : null; // Within 500m
    }
    
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    async updateActivityStats() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/location/active`, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            if (!response.ok) return;
            
            const locations = await response.json();
            
            const drivers = locations.filter(loc => loc.role === 'driver').length;
            const passengers = locations.filter(loc => loc.role === 'passenger').length;
            const total = locations.length;
            
            document.getElementById('driversCount').textContent = drivers;
            document.getElementById('passengersCount').textContent = passengers;
            document.getElementById('activeUsers').textContent = total;
            
        } catch (error) {
            console.error('Failed to update activity stats:', error);
        }
    }
    
    startPeriodicUpdates() {
        setInterval(() => {
            this.updateActivityStats();
        }, this.config.updateInterval);
    }
    
    showSettings() {
        const emergencyContact = localStorage.getItem('emergency_contact') || '';
        document.getElementById('emergencyContact').value = emergencyContact;
        this.showModal('settingsModal');
    }
    
    saveEmergencyContact() {
        const contact = document.getElementById('emergencyContact').value;
        localStorage.setItem('emergency_contact', contact);
        this.showToast('Emergency contact saved', 'success');
    }
    
    async endSession() {
        try {
            if (this.sessionToken) {
                await fetch(`${this.config.apiBaseUrl}/auth/end-session`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.sessionToken}`
                    }
                });
            }
            
            // Clear session data
            localStorage.removeItem('oau_bike_session');
            localStorage.removeItem('oau_bike_role');
            
            // Close WebSocket
            if (this.websocket) {
                this.websocket.close();
                this.websocket = null;
            }
            
            // Clear markers
            this.markers.forEach(marker => this.map.removeLayer(marker));
            this.markers.clear();
            
            if (this.userMarker) {
                this.map.removeLayer(this.userMarker);
                this.userMarker = null;
            }
            
            // Stop location tracking
            this.stopLocationTracking();
            
            // Reset state
            this.sessionToken = null;
            this.currentUser = null;
            this.userLocation = null;
            
            this.hideModal('settingsModal');
            this.showToast('Session ended', 'success');
            
            // Show role selection again
            setTimeout(() => {
                this.showDisclaimer();
            }, 1000);
            
        } catch (error) {
            console.error('End session failed:', error);
            this.showToast('Failed to end session properly', 'warning');
        }
    }
    
    stopLocationTracking() {
        if (this.locationWatcher) {
            navigator.geolocation.clearWatch(this.locationWatcher);
            this.locationWatcher = null;
        }
    }
    
    // Utility Methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    showDisclaimer() {
        this.showModal('disclaimerModal');
    }
    
    showRoleSelection() {
        this.showModal('roleModal');
    }
    
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas ${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    extractSessionId(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.session_token || 'anonymous';
        } catch {
            return 'anonymous';
        }
    }
}

class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleOnline();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleOffline();
        });
    }
    
    handleOnline() {
        console.log('App is back online');
        this.showToast('Connection restored - syncing data...', 'success');
        this.forceSync();
    }
    
    handleOffline() {
        console.log('App is offline');
        this.showToast('No internet connection - data will be stored locally', 'warning');
    }
    
    async forceSync() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                const messageChannel = new MessageChannel();
                
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.type === 'SYNC_COMPLETE') {
                        if (event.data.success) {
                            this.showToast('Data synchronized successfully', 'success');
                        } else {
                            this.showToast('Some data failed to sync', 'warning');
                        }
                    }
                };
                
                navigator.serviceWorker.controller.postMessage(
                    { type: 'FORCE_SYNC' },
                    [messageChannel.port2]
                );
                
            } catch (error) {
                console.error('Failed to force sync:', error);
            }
        }
    }
    
    async getSyncStatus() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                const messageChannel = new MessageChannel();
                
                return new Promise((resolve) => {
                    messageChannel.port1.onmessage = (event) => {
                        if (event.data.type === 'SYNC_STATUS') {
                            resolve(event.data);
                        }
                    };
                    
                    navigator.serviceWorker.controller.postMessage(
                        { type: 'GET_SYNC_STATUS' },
                        [messageChannel.port2]
                    );
                });
                
            } catch (error) {
                console.error('Failed to get sync status:', error);
                return { isOnline: this.isOnline, dbInitialized: false };
            }
        }
        
        return { isOnline: this.isOnline, dbInitialized: false };
    }
    
    showToast(message, type) {
        // Use your existing toast notification system
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        }
    }
}


// Initialize app when page loads
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new OAUBikeApp();
});

// Export for global access
window.OAUBikeApp = OAUBikeApp;

// Initialize offline manager
const offlineManager = new OfflineManager();