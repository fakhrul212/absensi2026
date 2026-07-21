// ===================== API Module =====================
// Connects frontend to Google Apps Script backend

// ✅ HARDCODED: URL Apps Script yang sudah di-deploy
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxNxecoJm3jXwOpOZZmMcixL8UaXaFXF5SEDCVcyWRoZgCBeWZgcvIhqN0g7Whfc_Y/exec';

// API Key untuk autentikasi (Bug #4 fix - harus sama dengan di kode.gs)
const API_KEY = 'SMANCA4-ABSENSI-2026-SECRET';

// Langsung gunakan URL default yang sudah di-hardcode
let API_URL = DEFAULT_API_URL;

// Check if API is configured
function isAPIConfigured() {
    return API_URL && API_URL.length > 0 && API_URL.startsWith('https://script.google.com');
}

// Set API URL
function setAPIUrl(url) {
    API_URL = url;
    localStorage.setItem('API_URL', url);
}

// Bug #1 fix: POST request untuk operasi sensitif
async function apiCallPost(action, params = {}) {
    if (!isAPIConfigured()) {
        throw new Error('API belum dikonfigurasi. Set URL Apps Script terlebih dahulu.');
    }

    // Kirim data via POST body (bukan URL params)
    const body = {
        action: action,
        apiKey: API_KEY,
        ...params
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain' // GAS requires text/plain for CORS
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API POST Error:', error);
        throw error;
    }
}

// GET request untuk operasi read-only (Bug #4 fix: tambah apiKey)
async function apiCall(action, params = {}) {
    if (!isAPIConfigured()) {
        throw new Error('API belum dikonfigurasi. Set URL Apps Script terlebih dahulu.');
    }

    const url = new URL(API_URL);
    url.searchParams.append('action', action);
    url.searchParams.append('apiKey', API_KEY);

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
// Bug #1 fix: Login via POST (password tidak muncul di URL)
async function apiLogin(nip, password) {
    return await apiCallPost('login', { nip, password });
}

async function apiGetUsers() {
    return await apiCall('getUsers');
}

// Bug #1 fix: Operasi sensitif via POST
async function apiAddUser(userData) {
    return await apiCallPost('addUser', { data: JSON.stringify(userData) });
}

async function apiUpdateUser(userData) {
    return await apiCallPost('updateUser', { data: JSON.stringify(userData) });
}

async function apiDeleteUser(nip) {
    return await apiCallPost('deleteUser', { nip });
}

// ===================== Attendance API =====================
async function apiSubmitAttendance(record) {
    return await apiCallPost('submitAttendance', { data: JSON.stringify(record) });
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
    return await apiCallPost('saveSettings', { data: JSON.stringify(settings) });
}

// ===================== Initialize Sheets =====================
async function apiInitSheets() {
    return await apiCall('init');
}

// ===================== Migration =====================
// Panggil sekali untuk migrasi password ke SHA-256
async function apiMigratePasswords() {
    return await apiCallPost('migratePasswords', {});
}
