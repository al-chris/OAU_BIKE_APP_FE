// OAU Campus Bike Visibility App
class OAUBikeApp {
    constructor() {
        this.currentUser = null;
        this.map = null;
        this.userLocation = null;
        this.markers = new Map();
        this.websocket = null;
        this.sessionToken = null;
        
        // Configuration
        this.config = {
            apiBaseUrl: 'http://localhost:80/api',
            wsBaseUrl: 'ws://localhost:80/ws',
            oauCenter: { lat: 7.5227, lng: 4.5198 },
            campusRadius: 5000, // meters
            updateInterval: 30000, // 30 seconds
        };
        
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
    
    initEventListeners() {
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
            this.showEmergencyConfirmation();
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
    
    async initializeApp() {
        try {
            // Initialize map
            await this.initMap();
            
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
    
    async initMap() {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined') {
                reject(new Error('Google Maps not loaded'));
                return;
            }
            
            const mapOptions = {
                center: this.config.oauCenter,
                zoom: 16,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ],
                restriction: {
                    latLngBounds: {
                        north: this.config.oauCenter.lat + 0.05,
                        south: this.config.oauCenter.lat - 0.05,
                        west: this.config.oauCenter.lng - 0.05,
                        east: this.config.oauCenter.lng + 0.05,
                    },
                    strictBounds: false,
                },
            };
            
            this.map = new google.maps.Map(document.getElementById('map'), mapOptions);
            
            // Add campus boundary circle
            const campusBoundary = new google.maps.Circle({
                strokeColor: '#2E7D32',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#2E7D32',
                fillOpacity: 0.1,
                map: this.map,
                center: this.config.oauCenter,
                radius: this.config.campusRadius,
            });
            
            // Add campus landmarks
            this.addCampusLandmarks();
            
            google.maps.event.addListenerOnce(this.map, 'idle', () => {
                resolve();
            });
        });
    }
    
    addCampusLandmarks() {
        const landmarks = [
            { name: 'Main Gate', lat: 7.5227, lng: 4.5198 },
            { name: 'Student Union Building', lat: 7.5245, lng: 4.5203 },
            { name: 'Mozambique Hostel', lat: 7.5280, lng: 4.5167 },
            { name: 'Angola Hostel', lat: 7.5289, lng: 4.5134 },
            { name: 'OAU Teaching Hospital', lat: 7.5345, lng: 4.5123 },
            { name: 'Sports Complex', lat: 7.5198, lng: 4.5234 },
        ];
        
        landmarks.forEach(landmark => {
            new google.maps.Marker({
                position: { lat: landmark.lat, lng: landmark.lng },
                map: this.map,
                title: landmark.name,
                icon: {
                    url: 'data:image/svg+xml,' + encodeURIComponent(`
                        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10" cy="10" r="8" fill="#757575" stroke="white" stroke-width="2"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(20, 20),
                }
            });
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
        
        navigator.geolocation.watchPosition(
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
            this.config.oauCenter.lat, this.config.oauCenter.lng
        );
        
        if (distance > this.config.campusRadius / 1000) {
            this.showToast('You are outside OAU campus boundaries', 'warning');
            return;
        }
        
        this.userLocation = { lat: latitude, lng: longitude };
        
        // Update location display
        this.updateLocationDisplay(latitude, longitude);
        
        // Send location to backend
        await this.sendLocationUpdate(latitude, longitude, accuracy);
        
        // Update user marker on map
        this.updateUserMarker(latitude, longitude);
    }
    
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
    
    updateUserMarker(latitude, longitude) {
        const position = { lat: latitude, lng: longitude };
        
        if (this.userMarker) {
            this.userMarker.setPosition(position);
        } else {
            const isDriver = this.currentUser.role === 'driver';
            const color = isDriver ? '#2E7D32' : '#C62828';
            
            this.userMarker = new google.maps.Marker({
                position,
                map: this.map,
                title: 'Your Location',
                icon: {
                    url: 'data:image/svg+xml,' + encodeURIComponent(`
                        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="3"/>
                            <circle cx="12" cy="12" r="4" fill="white"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(24, 24),
                },
                zIndex: 1000
            });
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
    
    updateOtherUserMarker(data) {
        const { session_id, role, latitude, longitude } = data;
        
        // Don't show our own marker
        if (session_id === this.extractSessionId(this.sessionToken)) {
            return;
        }
        
        const position = { lat: latitude, lng: longitude };
        const isDriver = role === 'driver';
        const color = isDriver ? '#2E7D32' : '#C62828';
        
        if (this.markers.has(session_id)) {
            this.markers.get(session_id).setPosition(position);
        } else {
            const marker = new google.maps.Marker({
                position,
                map: this.map,
                title: `${role} (Anonymous)`,
                icon: {
                    url: 'data:image/svg+xml,' + encodeURIComponent(`
                        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(20, 20),
                }
            });
            
            this.markers.set(session_id, marker);
        }
        
        // Update activity stats
        this.updateActivityStats();
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
                    latitude: this.userLocation.lat,
                    longitude: this.userLocation.lng,
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
                    latitude: this.userLocation.lat,
                    longitude: this.userLocation.lng,
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
                    <p>Campus Security: ${this.config.emergencyContacts?.security || 'N/A'}</p>
                    <p>Student Union: ${this.config.emergencyContacts?.union || 'N/A'}</p>
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
                this.updateUserMarker(this.userLocation.lat, this.userLocation.lng);
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
        
        // Find nearest landmark (simplified)
        const landmark = this.findNearestLandmark(latitude, longitude);
        landmarkElement.textContent = landmark ? `Near ${landmark}` : '';
    }
    
    findNearestLandmark(lat, lng) {
        const landmarks = [
            { name: 'Main Gate', lat: 7.5227, lng: 4.5198 },
            { name: 'Student Union Building', lat: 7.5245, lng: 4.5203 },
            { name: 'Mozambique Hostel', lat: 7.5280, lng: 4.5167 },
            { name: 'Angola Hostel', lat: 7.5289, lng: 4.5134 },
        ];
        
        let nearest = null;
        let minDistance = Infinity;
        
        landmarks.forEach(landmark => {
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
    
    centerMapOnCampus() {
        if (this.map) {
            this.map.setCenter(this.config.oauCenter);
            this.map.setZoom(16);
        }
    }
    
    centerMapOnUser() {
        if (this.map && this.userLocation) {
            this.map.setCenter(this.userLocation);
            this.map.setZoom(18);
        } else {
            this.showToast('User location not available', 'warning');
        }
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
            this.markers.forEach(marker => marker.setMap(null));
            this.markers.clear();
            
            if (this.userMarker) {
                this.userMarker.setMap(null);
                this.userMarker = null;
            }
            
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
    
    handleEmergencyAlert(data) {
        const { alert_type, latitude, longitude, landmark, timestamp } = data;
        
        // Show emergency notification
        this.showToast(`Emergency Alert: ${alert_type} near ${landmark}`, 'error');
        
        // Add emergency marker to map
        const emergencyMarker = new google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: this.map,
            title: `Emergency: ${alert_type}`,
            icon: {
                url: 'data:image/svg+xml,' + encodeURIComponent(`
                    <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="15" r="12" fill="#C62828" stroke="white" stroke-width="3"/>
                        <text x="15" y="20" text-anchor="middle" fill="white" font-size="16" font-weight="bold">!</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(30, 30),
            },
            animation: google.maps.Animation.BOUNCE
        });
        
        // Remove emergency marker after 5 minutes
        setTimeout(() => {
            emergencyMarker.setMap(null);
        }, 300000);
    }
    
    stopLocationTracking() {
        if (this.locationWatcher) {
            navigator.geolocation.clearWatch(this.locationWatcher);
            this.locationWatcher = null;
        }
    }
}

// Initialize app when page loads
let app;

function initMap() {
    // This function is called by Google Maps API
    if (!app) {
        app = new OAUBikeApp();
    }
}

// Initialize app if Google Maps is already loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof google !== 'undefined' && !app) {
        app = new OAUBikeApp();
    }
});

// Handle app installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button (could be added to settings)
    console.log('App can be installed');
});

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for global access
window.OAUBikeApp = OAUBikeApp;