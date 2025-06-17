// Maps Management for RoadLens
let trafficMap = null;
let reportingMap = null;
let trafficMarkers = [];
let reportMarkers = [];
let selectionMarker = null;

const TASHKENT_CENTER = [41.2995, 69.2401];

// Initialize both maps
function initializeMaps() {
    initializeTrafficMap();
    initializeReportingMap();
}

// Initialize Traffic Monitoring Map
function initializeTrafficMap() {
    trafficMap = new ymaps.Map('trafficMap', {
        center: TASHKENT_CENTER,
        zoom: 11,
        controls: ['zoomControl', 'searchControl', 'typeSelector', 'fullscreenControl']
    });

    // Add traffic layer
    const trafficControl = new ymaps.control.TrafficControl({
        state: {
            providerKey: 'traffic#actual',
            trafficShown: true
        }
    });
    
    trafficMap.controls.add(trafficControl);

    // Load initial traffic data
    loadTrafficData();
    
    // Add custom controls
    addTrafficControls();
}

// Initialize Issue Reporting Map
function initializeReportingMap() {
    reportingMap = new ymaps.Map('reportingMap', {
        center: TASHKENT_CENTER,
        zoom: 12,
        controls: ['zoomControl', 'searchControl', 'typeSelector']
    });

    // Add click event for location selection
    reportingMap.events.add('click', function(e) {
        const coords = e.get('coords');
        selectLocationOnMap(coords);
    });

    // Add hint for users
    const hint = new ymaps.Hint(reportingMap);
    hint.add({
        position: reportingMap.getCenter(),
        text: 'Click on the map to select a location for your report'
    });
}

// Load traffic data and add markers
async function loadTrafficData() {
    try {
        const trafficData = await api.getTrafficData();
        
        // Clear existing markers
        trafficMarkers.forEach(marker => trafficMap.geoObjects.remove(marker));
        trafficMarkers = [];
        
        // Add new markers
        trafficData.forEach(location => {
            const color = getTrafficColor(location.congestion_level);
            
            const placemark = new ymaps.Placemark([location.latitude, location.longitude], {
                hintContent: location.location_name,
                balloonContentHeader: location.location_name,
                balloonContentBody: `
                    <div style="padding: 10px;">
                        <p><strong>Congestion Level:</strong> ${location.congestion_level}/10</p>
                        <p><strong>Status:</strong> ${getTrafficStatus(location.congestion_level)}</p>
                        <p><strong>Last Updated:</strong> ${new Date(location.recorded_at).toLocaleTimeString()}</p>
                    </div>
                `,
                congestionLevel: location.congestion_level
            }, {
                preset: 'islands#circleDotIcon',
                iconColor: color
            });
            
            trafficMap.geoObjects.add(placemark);
            trafficMarkers.push(placemark);
        });
        
    } catch (error) {
        console.error('Failed to load traffic data:', error);
    }
}

// Update traffic markers with new data
function updateTrafficMarkers(trafficData) {
    trafficData.forEach((location, index) => {
        if (trafficMarkers[index]) {
            const color = getTrafficColor(location.congestion_level);
            trafficMarkers[index].options.set('iconColor', color);
            trafficMarkers[index].properties.set({
                congestionLevel: location.congestion_level,
                balloonContentBody: `
                    <div style="padding: 10px;">
                        <p><strong>Congestion Level:</strong> ${location.congestion_level}/10</p>
                        <p><strong>Status:</strong> ${getTrafficStatus(location.congestion_level)}</p>
                        <p><strong>Last Updated:</strong> ${new Date(location.recorded_at).toLocaleTimeString()}</p>
                    </div>
                `
            });
        }
    });
}

// Load reports on the reporting map
async function loadReportsOnMap() {
    try {
        const reports = await api.getReports({ limit: 100 });
        
        reports.reports.forEach(report => {
            addReportToMap(report);
        });
        
    } catch (error) {
        console.error('Failed to load reports:', error);
    }
}

// Add a single report to the map
function addReportToMap(report) {
    const color = getReportColor(report.status);
    const icon = getReportIcon(report.issue_type);
    
    const placemark = new ymaps.Placemark([report.latitude, report.longitude], {
        hintContent: `${report.issue_type.replace('_', ' ').toUpperCase()} - ${report.status.toUpperCase()}`,
        balloonContentHeader: `<strong>${report.issue_type.replace('_', ' ').toUpperCase()}</strong>`,
        balloonContentBody: `
            <div style="padding: 10px; max-width: 300px;">
                <p><strong>Status:</strong> <span style="color: ${color}">${report.status.toUpperCase()}</span></p>
                <p><strong>Severity:</strong> ${report.severity.toUpperCase()}</p>
                <p><strong>Description:</strong> ${report.description}</p>
                <p><strong>Reported:</strong> ${new Date(report.created_at).toLocaleDateString()}</p>
                ${report.address ? `<p><strong>Address:</strong> ${report.address}</p>` : ''}
            </div>
        `,
        reportId: report.id
    }, {
        preset: icon,
        iconColor: color
    });
    
    reportingMap.geoObjects.add(placemark);
    reportMarkers.push(placemark);
}

// Handle location selection on map
function selectLocationOnMap(coords) {
    // Remove previous selection
    if (selectionMarker) {
        reportingMap.geoObjects.remove(selectionMarker);
    }
    
    // Add new selection marker
    selectionMarker = new ymaps.Placemark(coords, {
        hintContent: 'Selected Location',
        balloonContent: 'Report location selected'
    }, {
        preset: 'islands#redCircleDotIcon',
        iconColor: '#e74c3c',
        draggable: true
    });
    
    // Allow marker to be dragged for fine-tuning
    selectionMarker.events.add('dragend', function(e) {
        const newCoords = e.get('target').geometry.getCoordinates();
        updateSelectedLocation(newCoords);
    });
    
    reportingMap.geoObjects.add(selectionMarker);
    
    // Update selected location
    updateSelectedLocation(coords);
}

// Update selected location details
async function updateSelectedLocation(coords) {
    selectedLocation = {
        lat: coords[0],
        lng: coords[1]
    };
    
    // Get address using reverse geocoding
    try {
        const geocode = await ymaps.geocode(coords);
        const firstGeoObject = geocode.geoObjects.get(0);
        const address = firstGeoObject.getAddressLine();
        
        selectedLocation.address = address;
        
        document.getElementById('locationDetails').innerHTML = `
            <strong>Address:</strong> ${address}<br>
            <strong>Coordinates:</strong> ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}
        `;
        document.getElementById('selectedLocation').style.display = 'block';
        
    } catch (error) {
        console.error('Geocoding failed:', error);
        document.getElementById('locationDetails').innerHTML = `
            <strong>Coordinates:</strong> ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}
        `;
        document.getElementById('selectedLocation').style.display = 'block';
    }
}

// Add custom controls to traffic map
function addTrafficControls() {
    // Legend control
    const legendControl = new ymaps.control.Button({
        data: {
            content: 'Legend',
            title: 'Show traffic congestion levels'
        },
        options: {
            selectOnClick: false,
            maxWidth: 100
        }
    });
    
    legendControl.events.add('click', function() {
        showTrafficLegend();
    });
    
    trafficMap.controls.add(legendControl, {
        float: 'left'
    });
    
    // Refresh control
    const refreshControl = new ymaps.control.Button({
        data: {
            content: 'Refresh',
            title: 'Refresh traffic data'
        },
        options: {
            selectOnClick: false,
            maxWidth: 100
        }
    });
    
    refreshControl.events.add('click', function() {
        loadTrafficData();
    });
    
    trafficMap.controls.add(refreshControl, {
        float: 'right'
    });
}

// Show traffic legend
function showTrafficLegend() {
    const legendContent = `
        <div style="padding: 15px; max-width: 300px;">
            <h4 style="margin: 0 0 10px 0;">Traffic Congestion Levels</h4>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 15px; height: 15px; background: #27ae60; border-radius: 50%; margin-right: 10px;"></div>
                <span>0-4: Light Traffic (Free Flow)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 15px; height: 15px; background: #f39c12; border-radius: 50%; margin-right: 10px;"></div>
                <span>4-6: Moderate Traffic</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 15px; height: 15px; background: #e67e22; border-radius: 50%; margin-right: 10px;"></div>
                <span>6-8: Heavy Traffic</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 15px; height: 15px; background: #e74c3c; border-radius: 50%; margin-right: 10px;"></div>
                <span>8-10: Very Heavy Traffic</span>
            </div>
            <div style="display: flex; align-items: center; margin: 5px 0;">
                <div style="width: 15px; height: 15px; background: #c0392b; border-radius: 50%; margin-right: 10px;"></div>
                <span>10: Gridlock</span>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                Click on markers for detailed information
            </p>
        </div>
    `;
    
    trafficMap.balloon.open(trafficMap.getCenter(), legendContent);
}

// Utility functions
function getTrafficColor(level) {
    if (level >= 8) return '#c0392b';
    if (level >= 6) return '#e74c3c';
    if (level >= 4) return '#f39c12';
    return '#27ae60';
}

function getTrafficStatus(level) {
    if (level >= 8) return 'Very Heavy Traffic';
    if (level >= 6) return 'Heavy Traffic';
    if (level >= 4) return 'Moderate Traffic';
    return 'Light Traffic';
}

function getReportColor(status) {
    switch (status) {
        case 'resolved': return '#27ae60';
        case 'in_progress': return '#f39c12';
        case 'pending': return '#e74c3c';
        default: return '#7f8c8d';
    }
}

function getReportIcon(issueType) {
    switch (issueType) {
        case 'pothole': return 'islands#redCircleIcon';
        case 'traffic_light': return 'islands#yellowIcon';
        case 'obstruction': return 'islands#orangeIcon';
        case 'signage': return 'islands#blueIcon';
        default: return 'islands#grayIcon';
    }
}

// Export functions for use in other modules
window.mapFunctions = {
    initializeMaps,
    loadTrafficData,
    updateTrafficMarkers,
    loadReportsOnMap,
    addReportToMap
};