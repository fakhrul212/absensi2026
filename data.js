// ===================== Data Module (Online Version) =====================
// Uses Google Sheets API via Apps Script

const KELAS_LIST = [
    // Kelas X
    'X.1', 'X.2', 'X.3', 'X.4', 'X.5', 'X.6', 'X.7', 'X.8',
    // Kelas XI
    'XI. IKL 1', 'XI. IKL 2', 'XI. IKL 3', 'XI. IT 1', 'XI. IT 2', 'XI. HM', 'XI. SOS 1', 'XI. SOS 2', 'XI. SOS 3', 'XI. SOS 4',
    // Kelas XII
    'XII. IKL 1', 'XII. IKL 2', 'XII. IKL 3', 'XII. IT 1', 'XII. IT 2', 'XII. HM', 'XII. SOS 1', 'XII. SOS 2', 'XII. SOS 3',
    // Ruangan Khusus
    'MUSHOLLA', 'LAPANGAN. DALAM', 'LAPANGAN. LUAR', 'PERPUSTAKAAN', 'LAB KOMPUTER', 'RUANG AGAMA HINDU', 'UPACARA BENDERA'
];

const JAM_OPTIONS = [
    { value: 0, label: 'Jam ke-0 ' },
    { value: 1, label: 'Jam ke-1 ' },
    { value: 2, label: 'Jam ke-2 ' },
    { value: 3, label: 'Jam ke-3 ' },
    { value: 4, label: 'Jam ke-4 ' },
    { value: 5, label: 'Jam ke-5 ' },
    { value: 6, label: 'Jam ke-6 ' },
    { value: 7, label: 'Jam ke-7 ' },
    { value: 8, label: 'Jam ke-8 ' },
    { value: 9, label: 'Jam ke-9 ' }
];

// Cache for data
let usersCache = null;
let attendanceCache = null;
let settingsCache = null;

// ===================== Initialize =====================
function initData() {
    // API URL sudah di-hardcode di api.js
    // Tidak perlu menampilkan modal konfigurasi
    console.log('API initialized with URL:', API_URL);
}

// ===================== Users Functions =====================
async function getUsers() {
    if (usersCache) return usersCache;

    try {
        const result = await apiGetUsers();
        if (result.success) {
            usersCache = result.users;
            return usersCache;
        }
    } catch (e) {
        console.error('Error getting users:', e);
    }

    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('users') || '[]');
}

async function saveUsers(users) {
    usersCache = users;
    // For online mode, use individual add/update/delete functions
}

async function addUserToSheet(userData) {
    try {
        const result = await apiAddUser(userData);
        if (result.success) {
            usersCache = null; // Clear cache
        }
        return result;
    } catch (e) {
        console.error('Error adding user:', e);
        return { success: false, message: e.toString() };
    }
}

async function updateUserInSheet(userData) {
    try {
        const result = await apiUpdateUser(userData);
        if (result.success) {
            usersCache = null;
        }
        return result;
    } catch (e) {
        console.error('Error updating user:', e);
        return { success: false, message: e.toString() };
    }
}

async function deleteUserFromSheet(nip) {
    try {
        const result = await apiDeleteUser(nip);
        if (result.success) {
            usersCache = null;
        }
        return result;
    } catch (e) {
        console.error('Error deleting user:', e);
        return { success: false, message: e.toString() };
    }
}

// ===================== Attendance Functions =====================
async function getAttendance(nip = '', date = '') {
    try {
        const result = nip ? await apiGetAttendance(nip, date) : await apiGetAllAttendance(date);
        if (result.success) {
            return result.records;
        }
    } catch (e) {
        console.error('Error getting attendance:', e);
    }
    return [];
}

async function addAttendanceRecord(record) {
    try {
        const result = await apiSubmitAttendance(record);
        return result;
    } catch (e) {
        console.error('Error submitting attendance:', e);
        return { success: false, message: e.toString() };
    }
}

// ===================== Settings Functions =====================
async function getSchoolProfile() {
    if (settingsCache) return settingsCache;

    try {
        const result = await apiGetSettings();
        if (result.success) {
            settingsCache = {
                name: result.settings.schoolName || '',
                principal: result.settings.principal || '',
                principalNip: result.settings.principalNip || '',
                address: result.settings.address || '',
                tahunAjaran: result.settings.tahunAjaran || '2025/2026'
            };
            return settingsCache;
        }
    } catch (e) {
        console.error('Error getting settings:', e);
    }

    return {
        name: 'SMA Negeri 1',
        principal: 'Kepala Sekolah',
        principalNip: '',
        address: '',
        tahunAjaran: '2025/2026'
    };
}

async function saveSchoolProfileData(profile) {
    try {
        const settings = {
            schoolName: profile.name,
            principal: profile.principal,
            principalNip: profile.principalNip,
            address: profile.address,
            tahunAjaran: profile.tahunAjaran
        };
        const result = await apiSaveSettings(settings);
        if (result.success) {
            settingsCache = profile;
        }
        return result;
    } catch (e) {
        console.error('Error saving settings:', e);
        return { success: false, message: e.toString() };
    }
}

// ===================== Helper Functions =====================
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialize
initData();
