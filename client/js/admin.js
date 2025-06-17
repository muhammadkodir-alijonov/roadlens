// Admin Dashboard Functions for RoadLens
let currentReports = [];
let currentPage = 1;
const reportsPerPage = 10;

// Load admin dashboard data
async function loadAdminDashboard() {
    try {
        showLoading();
        
        // Load statistics
        await loadAdminStats();
        
        // Load reports table
        await loadReportsTable();
        
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
        showAlert('Failed to load dashboard data', 'error');
    } finally {
        hideLoading();
    }
}

// Load admin statistics
async function loadAdminStats() {
    try {
        const stats = await api.getReportStats();
        
        // Update summary cards
        document.getElementById('totalReports').textContent = stats.summary.total || '0';
        document.getElementById('pendingReports').textContent = stats.summary.pending || '0';
        
    } catch (error) {
        console.error('Failed to load admin stats:', error);
    }
}

// Load reports table with pagination
async function loadReportsTable(page = 1) {
    try {
        const offset = (page - 1) * reportsPerPage;
        const response = await api.getReports({
            limit: reportsPerPage,
            offset: offset
        });
        
        currentReports = response.reports;
        currentPage = page;
        
        renderReportsTable(response.reports);
        renderPagination(response.pagination);
        
    } catch (error) {
        console.error('Failed to load reports:', error);
        showAlert('Failed to load reports', 'error');
    }
}

// Render reports in table
function renderReportsTable(reports) {
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '';
    
    if (reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    No reports found
                </td>
            </tr>
        `;
        return;
    }
    
    reports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${String(report.id).padStart(3, '0')}</td>
            <td>${formatIssueType(report.issue_type)}</td>
            <td>${truncateText(report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`, 30)}</td>
            <td>
                <span class="severity-${report.severity}">
                    ${report.severity.toUpperCase()}
                </span>
            </td>
            <td>
                <span class="status-badge status-${report.status}">
                    ${report.status.replace('_', ' ').toUpperCase()}
                </span>
            </td>
            <td>${formatDate(report.created_at)}</td>
            <td>
                <div class="action-buttons">
                    ${getActionButtons(report)}
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Get action buttons based on report status
function getActionButtons(report) {
    const buttons = [];
    
    if (report.status === 'pending') {
        buttons.push(`
            <button class="btn btn-small btn-warning" onclick="updateReportStatus(${report.id}, 'in_progress')">
                Start
            </button>
        `);
    }
    
    if (report.status === 'in_progress') {
        buttons.push(`
            <button class="btn btn-small btn-success" onclick="updateReportStatus(${report.id}, 'resolved')">
                Resolve
            </button>
        `);
    }
    
    if (report.status === 'resolved') {
        buttons.push(`
            <button class="btn btn-small" disabled>
                Completed
            </button>
        `);
    }
    
    buttons.push(`
        <button class="btn btn-small btn-info" onclick="viewReportDetails(${report.id})">
            View
        </button>
    `);
    
    buttons.push(`
        <button class="btn btn-small btn-danger" onclick="deleteReport(${report.id})">
            Delete
        </button>
    `);
    
    return buttons.join(' ');
}

// Update report status
async function updateReportStatus(reportId, newStatus) {
    try {
        showLoading();
        
        await api.updateReport(reportId, { status: newStatus });
        
        showAlert(`Report #${reportId} status updated to ${newStatus}`, 'success');
        
        // Reload table
        await loadReportsTable(currentPage);
        
        // Update stats
        await loadAdminStats();
        
    } catch (error) {
        console.error('Failed to update report:', error);
        showAlert('Failed to update report status', 'error');
    } finally {
        hideLoading();
    }
}

// Delete report
async function deleteReport(reportId) {
    if (!confirm(`Are you sure you want to delete report #${reportId}?`)) {
        return;
    }
    
    try {
        showLoading();
        
        await api.deleteReport(reportId);
        
        showAlert(`Report #${reportId} deleted successfully`, 'success');
        
        // Reload table
        await loadReportsTable(currentPage);
        
        // Update stats
        await loadAdminStats();
        
    } catch (error) {
        console.error('Failed to delete report:', error);
        showAlert('Failed to delete report', 'error');
    } finally {
        hideLoading();
    }
}

// View report details
async function viewReportDetails(reportId) {
    try {
        const report = await api.getReport(reportId);
        
        const modalContent = `
            <div style="max-width: 600px;">
                <h3>Report #${String(report.id).padStart(3, '0')}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                    <div>
                        <strong>Issue Type:</strong><br>
                        ${formatIssueType(report.issue_type)}
                    </div>
                    <div>
                        <strong>Status:</strong><br>
                        <span class="status-badge status-${report.status}">
                            ${report.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <strong>Severity:</strong><br>
                        <span class="severity-${report.severity}">
                            ${report.severity.toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <strong>Created:</strong><br>
                        ${new Date(report.created_at).toLocaleString()}
                    </div>
                    <div style="grid-column: span 2;">
                        <strong>Description:</strong><br>
                        ${report.description}
                    </div>
                    <div style="grid-column: span 2;">
                        <strong>Location:</strong><br>
                        ${report.address || 'No address available'}<br>
                        <small>Coordinates: ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}</small>
                    </div>
                    ${report.reporter_name ? `
                        <div>
                            <strong>Reporter:</strong><br>
                            ${report.reporter_name}
                        </div>
                    ` : ''}
                    ${report.reporter_contact ? `
                        <div>
                            <strong>Contact:</strong><br>
                            ${report.reporter_contact}
                        </div>
                    ` : ''}
                    ${report.resolved_at ? `
                        <div style="grid-column: span 2;">
                            <strong>Resolved:</strong><br>
                            ${new Date(report.resolved_at).toLocaleString()}
                        </div>
                    ` : ''}
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <button class="btn" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
        
        showModal(modalContent);
        
    } catch (error) {
        console.error('Failed to load report details:', error);
        showAlert('Failed to load report details', 'error');
    }
}

// Render pagination
function renderPagination(pagination) {
    const container = document.createElement('div');
    container.className = 'pagination';
    container.style.cssText = 'margin-top: 20px; text-align: center;';
    
    const totalPages = pagination.pages;
    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
    
    // Previous button
    if (currentPage > 1) {
        container.innerHTML += `
            <button class="btn btn-small" onclick="loadReportsTable(${currentPage - 1})">
                Previous
            </button>
        `;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            container.innerHTML += `
                <button class="btn btn-small ${i === currentPage ? 'active' : ''}" 
                        onclick="loadReportsTable(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            container.innerHTML += ' ... ';
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        container.innerHTML += `
            <button class="btn btn-small" onclick="loadReportsTable(${currentPage + 1})">
                Next
            </button>
        `;
    }
    
    // Add to page
    const tableContainer = document.querySelector('.table-container');
    const existingPagination = tableContainer.querySelector('.pagination');
    if (existingPagination) {
        existingPagination.remove();
    }
    tableContainer.appendChild(container);
}

// Show modal
function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        ">
            ${content}
        </div>
    `;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.body.appendChild(modal);
}

// Close modal
window.closeModal = function() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
};

// Utility functions
function formatIssueType(type) {
    return type.replace(/_/g, ' ').toUpperCase();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    
    // Default to date
    return date.toLocaleDateString();
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Add some additional CSS for admin styles
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    .btn-small {
        padding: 6px 12px;
        font-size: 0.85rem;
        margin: 0 2px;
    }
    
    .btn-warning {
        background: linear-gradient(135deg, #f39c12, #e67e22);
    }
    
    .btn-info {
        background: linear-gradient(135deg, #3498db, #2980b9);
    }
    
    .severity-low { color: #27ae60; }
    .severity-medium { color: #f39c12; }
    .severity-high { color: #e67e22; }
    .severity-critical { color: #e74c3c; font-weight: bold; }
    
    .action-buttons {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
    }
    
    .pagination {
        display: flex;
        gap: 5px;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .pagination .btn.active {
        background: linear-gradient(135deg, #34495e, #2c3e50);
    }
`;
document.head.appendChild(adminStyles);

// Export functions
window.adminFunctions = {
    loadAdminDashboard,
    loadReportsTable,
    updateReportStatus,
    deleteReport,
    viewReportDetails
};