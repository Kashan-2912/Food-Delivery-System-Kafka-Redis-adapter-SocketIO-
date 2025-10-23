// Authentication utilities

// Get token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Set token in localStorage
function setToken(token) {
  localStorage.setItem('token', token);
}

// Remove token
function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Get user from localStorage
function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Set user in localStorage
function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// Check if user is authenticated
function isAuthenticated() {
  return !!getToken();
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Redirect based on user role
function redirectToDashboard(user) {
  if (user.role === 'customer') {
    window.location.href = '/customer-dashboard.html';
  } else if (user.role === 'restaurant') {
    window.location.href = '/restaurant-dashboard.html';
  } else {
    window.location.href = '/index.html';
  }
}

// Logout
function logout() {
  removeToken();
  window.location.href = '/login.html';
}

// Show alert message
function showAlert(message, type = 'info') {
  const alertDiv = document.getElementById('alert');
  if (alertDiv) {
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.classList.remove('hidden');
    
    setTimeout(() => {
      alertDiv.classList.add('hidden');
    }, 5000);
  }
}

// API call helper
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };

  const response = await fetch(`/api${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }

  return data;
}

// Format currency
function formatCurrency(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get status badge class
function getStatusBadgeClass(status) {
  const statusMap = {
    'pending': 'badge-warning',
    'confirmed': 'badge-info',
    'preparing': 'badge-info',
    'ready': 'badge-success',
    'out_for_delivery': 'badge-info',
    'delivered': 'badge-success',
    'cancelled': 'badge-danger',
  };
  return statusMap[status] || 'badge-info';
}

