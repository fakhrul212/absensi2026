// ===================== API Module =====================
// Connects frontend to Google Apps Script backend

// ✅ HARDCODED: URL Apps Script yang sudah di-deploy
// Format: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxNxecoJm3jXwOpOZZmMcixL8UaXaFXF5SEDCVcyWRoZgCBeWZgcvIhqN0g7Whfc_Y/exec';

// Langsung gunakan URL default yang sudah di-hardcode
let API_URL = DEFAULT_API_URL;

// Check if API is configured - selalu true jika DEFAULT_API_URL sudah diisi
function isAPIConfigured() {
    return API_URL && API_URL.length > 0 && API_URL.startsWith('https://script.google.com');
}

// Set API URL
function setAPIUrl(url) {
    API_URL = url;
    localStorage.setItem('API_URL', url);
}

// Generic API call function
async function apiCall(action, params = {}) {
    if (!isAPIConfigured()) {
        throw new Error('API belum dikonfigurasi. Set URL Apps Script terlebih dahulu.');
    }

    const url = new URL(API_URL);
    url.searchParams.append('action', action);

    for (const key in params) {
        if (typeof params[key] === 'object') {
            url.searchParams.append(key, JSON.stringify(params[key]));
        } else {
            url.searchParams.append(key, params[key]);
        }
    }

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow'
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===================== User API =====================
async function apiLogin(nip, password) {
    return await apiCall('login', { nip, password });
}

async function apiGetUsers() {
    return await apiCall('getUsers');
}

async function apiAddUser(userData) {
    return await apiCall('addUser', { data: userData });
}

async function apiUpdateUser(userData) {
    return await apiCall('updateUser', { data: userData });
}

async function apiDeleteUser(nip) {
    return await apiCall('deleteUser', { nip });
}

// ===================== Attendance API =====================
async function apiSubmitAttendance(record) {
    return await apiCall('submitAttendance', { data: record });
}

async function apiGetAttendance(nip = '', date = '') {
    return await apiCall('getAttendance', { nip, date });
}

async function apiGetAllAttendance(date = '') {
    return await apiCall('getAllAttendance', { date });
}

// ===================== Settings API =====================
async function apiGetSettings() {
    return await apiCall('getSettings');
}

async function apiSaveSettings(settings) {
    return await apiCall('saveSettings', { data: settings });
}

// ===================== Initialize Sheets =====================
async function apiInitSheets() {
    return await apiCall('init');
}
