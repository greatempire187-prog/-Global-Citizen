const API_BASE_URL = 'http://localhost:5000/api';

let currentUser = null;
let currentTheme = localStorage.getItem('theme') || 'light';

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupTheme();
    setupNavigation();
    setupMobileMenu();
    setupReportForm();
    loadDashboardData();
    loadSecurityReports();
}

function setupTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    themeToggle.addEventListener('click', function() {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        
        icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            navigateToPage(page);
        });
    });
}

function setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
    });
    
    document.addEventListener('click', function(e) {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });
}

function navigateToPage(pageName) {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
    
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
        
        if (pageName === 'dashboard') {
            loadDashboardData();
        } else if (pageName === 'security') {
            loadSecurityReports();
        }
    }
    
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.remove('active');
}

async function loadDashboardData() {
    try {
        showLoading('reports-loading');
        
        const response = await fetch(`${API_BASE_URL}/reports`);
        if (!response.ok) throw new Error('Failed to fetch reports');
        
        const reports = await response.json();
        
        updateDashboardStats(reports);
        displayReportsTable(reports);
        
        hideLoading('reports-loading');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideLoading('reports-loading');
        showErrorMessage('Failed to load dashboard data');
    }
}

function updateDashboardStats(reports) {
    const totalReports = reports.length;
    const securityReports = reports.filter(r => r.category === 'Security').length;
    const migrationReports = reports.filter(r => r.category === 'Migration').length;
    
    animateNumber('total-reports', totalReports);
    animateNumber('security-reports', securityReports);
    animateNumber('migration-reports', migrationReports);
}

function animateNumber(elementId, targetNumber) {
    const element = document.getElementById(elementId);
    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentNumber = 0;
    const increment = targetNumber / steps;
    
    const timer = setInterval(() => {
        currentNumber += increment;
        if (currentNumber >= targetNumber) {
            currentNumber = targetNumber;
            clearInterval(timer);
        }
        element.textContent = Math.floor(currentNumber);
    }, stepDuration);
}

function displayReportsTable(reports) {
    const tbody = document.getElementById('reports-tbody');
    tbody.innerHTML = '';
    
    reports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(report.title)}</td>
            <td><span class="category-badge category-${report.category.toLowerCase()}">${report.category}</span></td>
            <td>${escapeHtml(report.location)}</td>
            <td>${formatDate(report.timestamp)}</td>
            <td>${escapeHtml(report.user)}</td>
        `;
        tbody.appendChild(row);
    });
}

async function loadSecurityReports() {
    try {
        showLoading('security-loading');
        
        const response = await fetch(`${API_BASE_URL}/security-monitor`);
        if (!response.ok) throw new Error('Failed to fetch security reports');
        
        const reports = await response.json();
        displaySecurityReports(reports);
        
        hideLoading('security-loading');
        
    } catch (error) {
        console.error('Error loading security reports:', error);
        hideLoading('security-loading');
        showErrorMessage('Failed to load security reports');
    }
}

function displaySecurityReports(reports) {
    const container = document.getElementById('security-reports');
    container.innerHTML = '';
    
    if (reports.length === 0) {
        container.innerHTML = '<p>No security reports available.</p>';
        return;
    }
    
    reports.forEach(report => {
        const card = document.createElement('div');
        card.className = 'security-report-card';
        card.innerHTML = `
            <div class="security-report-title">${escapeHtml(report.title)}</div>
            <div class="security-report-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(report.location)}</span>
                <span><i class="fas fa-user"></i> ${escapeHtml(report.user)}</span>
                <span><i class="fas fa-clock"></i> ${formatDate(report.timestamp)}</span>
            </div>
            <div class="security-report-description">${escapeHtml(report.description)}</div>
        `;
        container.appendChild(card);
    });
}

function setupReportForm() {
    const form = document.getElementById('report-form');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
            user_id: parseInt(formData.get('user_id')),
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            location: formData.get('location').trim()
        };
        
        if (!validateReportForm(data)) {
            return;
        }
        
        await submitReport(data);
    });
}

function validateReportForm(data) {
    const messageDiv = document.getElementById('form-message');
    
    if (!data.user_id || data.user_id <= 0) {
        showFormMessage('Please enter a valid User ID', 'error');
        return false;
    }
    
    if (!data.title || data.title.length < 3) {
        showFormMessage('Title must be at least 3 characters long', 'error');
        return false;
    }
    
    if (!data.description || data.description.length < 10) {
        showFormMessage('Description must be at least 10 characters long', 'error');
        return false;
    }
    
    if (!data.location || data.location.length < 2) {
        showFormMessage('Please enter a valid location', 'error');
        return false;
    }
    
    return true;
}

async function submitReport(data) {
    try {
        showFormMessage('Submitting report...', 'success');
        
        const response = await fetch(`${API_BASE_URL}/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showFormMessage(`Report submitted successfully! Category: ${result.category}`, 'success');
            document.getElementById('report-form').reset();
            
            setTimeout(() => {
                navigateToPage('dashboard');
            }, 2000);
        } else {
            showFormMessage(result.error || 'Failed to submit report', 'error');
        }
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showFormMessage('Network error. Please try again.', 'error');
    }
}

function showFormMessage(message, type) {
    const messageDiv = document.getElementById('form-message');
    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-message error';
    errorDiv.textContent = message;
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '1000';
    errorDiv.style.display = 'block';
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) {
        return 'Just now';
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const searchReports = debounce(async function(query) {
    if (query.length < 2) {
        loadDashboardData();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/reports?search=${encodeURIComponent(query)}`);
        if (response.ok) {
            const reports = await response.json();
            displayReportsTable(reports);
        }
    } catch (error) {
        console.error('Error searching reports:', error);
    }
}, 300);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const navMenu = document.querySelector('.nav-menu');
        navMenu.classList.remove('active');
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}
