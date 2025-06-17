// Main Application JavaScript
let currentSection = 'monitoring';
let selectedLocation = null;
let authToken = localStorage.getItem('authToken');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up navigation
    setupNavigation();
    
    // Check authentication
    checkAuthentication();
    
    // Initialize maps when Yandex Maps is ready
    ymaps.ready(() => {
        initializeMaps();
        loadReportsOnMap();
    });
    
    // Initialize charts
    initializeAllCharts();
    
    // Load initial data
    loadDashboardData();
    
    // Set up form handlers
    setupFormHandlers();
    
    // Start real-time updates
    startRealTimeUpdates();
}

// Navigation setup
function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            showSection(targetSection);
        });
    });
}

// Show/hide sections
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked tab
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    
    currentSection = sectionId;
    
    // Load section-specific data
    if (sectionId === 'analytics') {
        updateAnalyticsCharts();
    } else if (sectionId === 'admin' && authToken) {
        loadAdminDashboard();
    }
}

// Check authentication status
function checkAuthentication() {
    if (authToken) {
        api.verifyToken().then(response => {
            if (response.valid) {
                showAdminDashboard();
            } else {
                localStorage.removeItem('authToken');
                authToken = null;
            }
        }).catch(() => {
            localStorage.removeItem('authToken');
            authToken = null;
        });
    }
}

// Form handlers
function setupFormHandlers() {
    // Report form
    const reportForm = document.getElementById('reportForm');
    reportForm.addEventListener('submit', handleReportSubmit);
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', handleLogout);
}

// Handle report submission
async function handleReportSubmit(e) {
    e.preventDefault();
    
    if (!selectedLocation) {
        showAlert('Please select a location on the map', 'error');
        return;
    }
    
    const formData = {
        issue_type: document.getElementById('issueType').value,
        description: document.getElementById('description').value,
        severity: document.getElementById('severity').value,
        reporter_name: document.getElementById('reporterName').value,
        reporter_contact: document.getElementById('reporterContact').value,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: selectedLocation.address
    };
    
    showLoading();
    
    try {
        const response = await api.createReport(formData);
        
        if (response.id) {
            showAlert('Report submitted successfully! Thank you for helping improve our roads.', 'success');
            reportForm.reset();
            document.getElementById('selectedLocation').style.display = 'none';
            selectedLocation = null;
            
            // Add new report to map
            addReportToMap(response);
            
            // Update dashboard
            loadDashboardData();
        }
    } catch (error) {
        showAlert('Failed to submit report. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    showLoading();
    
    try {
        const response = await api.login(username, password);
        
        if (response.token) {
            authToken = response.token;
            localStorage.setItem('authToken', authToken);
            showAdminDashboard();
            loadAdminDashboard();
        }
    } catch (error) {
        showAlert('Invalid credentials. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Handle logout
function handleLogout() {
    authToken = null;
    localStorage.removeItem('authToken');
    hideAdminDashboard();
}

// Show/hide admin dashboard
function showAdminDashboard() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
}

function hideAdminDashboard() {
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('loginForm').reset();
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Get congestion index
        const congestionData = await api.getCongestionIndex();
        document.getElementById('congestionLevel').textContent = congestionData.congestionIndex;
        document.getElementById('lastUpdated').textContent = formatTimeAgo(congestionData.timestamp);
        
        // Get report statistics
        const stats = await api.getReportStats();
        document.getElementById('activeIssues').textContent = stats.summary.pending;
        document.getElementById('resolvedToday').textContent = stats.summary.today;
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Real-time updates
function startRealTimeUpdates() {
    // Update traffic data every minute
    setInterval(() => {
        if (currentSection === 'monitoring') {
            updateTrafficData();
        }
    }, 60000);
    
    // Update dashboard every 5 minutes
    setInterval(() => {
        loadDashboardData();
    }, 300000);
}

// Update traffic data
async function updateTrafficData() {
    try {
        const trafficData = await api.getTrafficData();
        updateTrafficMarkers(trafficData);
        
        // Update congestion index
        const congestionData = await api.getCongestionIndex();
        document.getElementById('congestionLevel').textContent = congestionData.congestionIndex;
        document.getElementById('lastUpdated').textContent = 'Just now';
        
    } catch (error) {
        console.error('Failed to update traffic data:', error);
    }
}

// Utility functions
function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(alert);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);