const axios = require('axios');

// Major locations in Tashkent for traffic monitoring
const TASHKENT_LOCATIONS = [
    { name: 'Amir Temur Square', lat: 41.2995, lng: 69.2401 },
    { name: 'Mustaqillik Avenue', lat: 41.3111, lng: 69.2497 },
    { name: 'Ring Road West', lat: 41.2866, lng: 69.2034 },
    { name: 'Chilanzar District', lat: 41.3258, lng: 69.2928 },
    { name: 'Airport Highway', lat: 41.2744, lng: 69.2169 },
    { name: 'Yunusabad District', lat: 41.3638, lng: 69.2859 },
    { name: 'Mirabad District', lat: 41.2891, lng: 69.2785 },
    { name: 'Shaykhantaur District', lat: 41.3252, lng: 69.2396 },
    { name: 'Hamza District', lat: 41.3436, lng: 69.3371 },
    { name: 'Sergeli District', lat: 41.2239, lng: 69.2179 }
];

// Get traffic data using Yandex Traffic API
async function getTrafficData() {
    try {
        // For MVP, we'll generate realistic traffic data
        // In production, this would make actual API calls to Yandex Traffic API
        
        const currentHour = new Date().getHours();
        const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
        const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
        
        const trafficData = TASHKENT_LOCATIONS.map(location => {
            let baseCongestion = 5.0;
            
            // Adjust based on time of day
            if (isRushHour && !isWeekend) {
                baseCongestion = 7.5 + Math.random() * 2;
            } else if (isWeekend) {
                baseCongestion = 4.0 + Math.random() * 2;
            } else if (currentHour >= 22 || currentHour <= 6) {
                baseCongestion = 2.0 + Math.random() * 2;
            } else {
                baseCongestion = 5.0 + Math.random() * 3;
            }
            
            // Add some randomness
            const congestionLevel = Math.max(0, Math.min(10, baseCongestion + (Math.random() - 0.5) * 2));
            
            return {
                location_name: location.name,
                latitude: location.lat,
                longitude: location.lng,
                congestion_level: parseFloat(congestionLevel.toFixed(1))
            };
        });
        
        return trafficData;
        
    } catch (error) {
        console.error('Error fetching traffic data:', error);
        throw error;
    }
}

// Get traffic info for a specific coordinate
async function getTrafficForCoordinate(lat, lng) {
    try {
        // Calculate congestion based on proximity to known congested areas
        const trafficData = await getTrafficData();
        
        // Find nearest location
        let nearestLocation = null;
        let minDistance = Infinity;
        
        trafficData.forEach(location => {
            const distance = Math.sqrt(
                Math.pow(location.latitude - lat, 2) + 
                Math.pow(location.longitude - lng, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestLocation = location;
            }
        });
        
        // If very close to a known location, use its congestion level
        if (minDistance < 0.01) {
            return nearestLocation.congestion_level;
        }
        
        // Otherwise, interpolate based on distance
        const interpolatedCongestion = nearestLocation.congestion_level * (1 - minDistance * 10);
        return Math.max(2.0, parseFloat(interpolatedCongestion.toFixed(1)));
        
    } catch (error) {
        console.error('Error getting traffic for coordinate:', error);
        return 5.0; // Default congestion level
    }
}

module.exports = {
    getTrafficData,
    getTrafficForCoordinate,
    TASHKENT_LOCATIONS
};