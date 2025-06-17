// Charts Management for RoadLens
let charts = {
    issueTypes: null,
    trafficTrends: null,
    regionalStats: null,
    resolution: null
};

// Chart configuration defaults
Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
Chart.defaults.plugins.legend.labels.padding = 15;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
Chart.defaults.plugins.tooltip.titleFont.size = 14;
Chart.defaults.plugins.tooltip.bodyFont.size = 12;

// Initialize all charts
function initializeAllCharts() {
    initializeIssueTypesChart();
    initializeTrafficTrendsChart();
    initializeRegionalStatsChart();
    initializeResolutionChart();
}

// Issue Types Distribution Chart
function initializeIssueTypesChart() {
    const ctx = document.getElementById('issueTypesChart').getContext('2d');
    
    charts.issueTypes = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#e74c3c',
                    '#f39c12',
                    '#3498db',
                    '#27ae60',
                    '#9b59b6'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Weekly Traffic Trends Chart
function initializeTrafficTrendsChart() {
    const ctx = document.getElementById('trafficTrendsChart').getContext('2d');
    
    charts.trafficTrends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Congestion Level',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3498db',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '/10';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Congestion: ${context.parsed.y}/10`;
                        }
                    }
                }
            }
        }
    });
}

// Regional Statistics Chart
function initializeRegionalStatsChart() {
    const ctx = document.getElementById('regionalStatsChart').getContext('2d');
    
    charts.regionalStats = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Reports',
                data: [],
                backgroundColor: [
                    'rgba(231, 76, 60, 0.8)',
                    'rgba(243, 156, 18, 0.8)',
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(39, 174, 96, 0.8)',
                    'rgba(155, 89, 182, 0.8)'
                ],
                borderColor: [
                    '#e74c3c',
                    '#f39c12',
                    '#3498db',
                    '#27ae60',
                    '#9b59b6'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        stepSize: 10
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Reports: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

// Resolution Time Analysis Chart
function initializeResolutionChart() {
    const ctx = document.getElementById('resolutionChart').getContext('2d');
    
    charts.resolution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Number of Reports',
                data: [],
                backgroundColor: [
                    'rgba(39, 174, 96, 0.8)',
                    'rgba(243, 156, 18, 0.8)',
                    'rgba(230, 126, 34, 0.8)',
                    'rgba(231, 76, 60, 0.8)'
                ],
                borderColor: [
                    '#27ae60',
                    '#f39c12',
                    '#e67e22',
                    '#e74c3c'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Reports resolved: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}

// Update all analytics charts with real data
async function updateAnalyticsCharts() {
    try {
        // Update Issue Types Chart
        const issueTypesData = await api.getChartData('issue-types');
        charts.issueTypes.data.labels = issueTypesData.labels;
        charts.issueTypes.data.datasets[0].data = issueTypesData.values;
        charts.issueTypes.update();
        
        // Update Traffic Trends Chart
        const trafficTrendsData = await api.getChartData('traffic-trends');
        charts.trafficTrends.data.labels = trafficTrendsData.labels;
        charts.trafficTrends.data.datasets[0].data = trafficTrendsData.values;
        charts.trafficTrends.update();
        
        // Update Regional Stats Chart
        const regionalData = await api.getChartData('regional-stats');
        charts.regionalStats.data.labels = regionalData.labels;
        charts.regionalStats.data.datasets[0].data = regionalData.values;
        charts.regionalStats.update();
        
        // Update Resolution Time Chart
        const resolutionData = await api.getChartData('resolution-time');
        charts.resolution.data.labels = resolutionData.labels;
        charts.resolution.data.datasets[0].data = resolutionData.values;
        charts.resolution.update();
        
    } catch (error) {
        console.error('Failed to update charts:', error);
        
        // Load with sample data if API fails
        loadSampleChartData();
    }
}

// Load sample data for demonstration
function loadSampleChartData() {
    // Issue Types
    charts.issueTypes.data.labels = ['POTHOLE', 'TRAFFIC LIGHT', 'OBSTRUCTION', 'SIGNAGE', 'OTHER'];
    charts.issueTypes.data.datasets[0].data = [35, 25, 20, 12, 8];
    charts.issueTypes.update();
    
    // Traffic Trends
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = new Date().getDay();
    const reorderedDays = [];
    for (let i = 0; i < 7; i++) {
        reorderedDays.push(days[(todayIndex + i + 1) % 7]);
    }
    
    charts.trafficTrends.data.labels = reorderedDays;
    charts.trafficTrends.data.datasets[0].data = [6.2, 7.5, 8.1, 7.8, 8.9, 5.4, 4.2];
    charts.trafficTrends.update();
    
    // Regional Stats
    charts.regionalStats.data.labels = ['Chilanzar', 'Yunusabad', 'Mirabad', 'Shaykhantaur', 'Yashnabad'];
    charts.regionalStats.data.datasets[0].data = [42, 35, 28, 31, 25];
    charts.regionalStats.update();
    
    // Resolution Time
    charts.resolution.data.labels = ['< 24h', '1-3 days', '3-7 days', '> 1 week'];
    charts.resolution.data.datasets[0].data = [15, 45, 25, 8];
    charts.resolution.update();
}

// Update specific chart
function updateChart(chartName, data) {
    if (charts[chartName]) {
        charts[chartName].data.labels = data.labels;
        charts[chartName].data.datasets[0].data = data.values;
        charts[chartName].update();
    }
}

// Destroy all charts (cleanup)
function destroyCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
}

// Export functions
window.chartFunctions = {
    initializeAllCharts,
    updateAnalyticsCharts,
    updateChart,
    destroyCharts
};