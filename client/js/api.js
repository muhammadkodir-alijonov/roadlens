// API Service for RoadLens
const API_BASE_URL = '/api';

const api = {
    // Get auth headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    },

    // Handle API responses
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }
        return response.json();
    },

    // Authentication
    async login(username, password) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return this.handleResponse(response);
    },

    async verifyToken() {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async changePassword(currentPassword, newPassword) {
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ currentPassword, newPassword })
        });
        return this.handleResponse(response);
    },

    // Reports
    async getReports(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/reports?${queryString}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async getReport(id) {
        const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async createReport(data) {
        const response = await fetch(`${API_BASE_URL}/reports`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    },

    async updateReport(id, data) {
        const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    },

    async deleteReport(id) {
        const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async getReportStats() {
        const response = await fetch(`${API_BASE_URL}/reports/stats/summary`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    // Analytics
    async getTrafficData() {
        const response = await fetch(`${API_BASE_URL}/analytics/traffic`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async getCongestionIndex() {
        const response = await fetch(`${API_BASE_URL}/analytics/congestion-index`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async getChartData(chartType) {
        const response = await fetch(`${API_BASE_URL}/analytics/charts/${chartType}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async updateDailyStats() {
        const response = await fetch(`${API_BASE_URL}/analytics/update-daily-stats`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }
};

// Make api available globally
window.api = api;