// =====================================================
// GOOGLE APPS SCRIPT - BACKEND ABSENSI GURU
// Copy seluruh kode ini ke Google Apps Script
// =====================================================

const SPREADSHEET_ID = '1mU6Knb_E30ErmQ7t_LPgn8iUv5GZPhsVuIdNPFfoaFY';

// Sheet names
const SHEET_USERS = 'Users';
const SHEET_ATTENDANCE = 'Attendance';
const SHEET_SETTINGS = 'Settings';

// API Key untuk autentikasi sederhana (Bug #4 fix)
// Ganti dengan key yang lebih aman jika diperlukan
const API_KEY = 'SMANCA4-ABSENSI-2026-SECRET';

// =====================================================
// MAIN HANDLER
// =====================================================
function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  // Parse POST body (Bug #1 fix - data sensitif via POST)
  let postData = {};
  try {
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
  } catch(err) {
    // fallback to parameter
  }
  
  // Merge POST data with parameters
  const merged = Object.assign({}, e.parameter || {}, postData);
  e.parameter = merged;
  
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  // Cek apakah e dan e.parameter ada
  if (!e || !e.parameter) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'API is running. Use action parameter to call specific functions.',
        version: '2.0'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const action = e.parameter.action || '';
  let result;
  
  try {
    // Bug #4 fix: Validasi API Key untuk semua request kecuali init
    if (action !== 'init' && action !== '') {
      const requestKey = e.parameter.apiKey || '';
      if (requestKey !== API_KEY) {
        return ContentService
          .createTextOutput(JSON.stringify({ 
            success: false, 
            message: 'Unauthorized: Invalid API key' 
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Operasi sensitif harus via POST (Bug #1 fix)
    const postOnlyActions = ['login', 'addUser', 'updateUser', 'deleteUser', 'saveSettings', 'submitAttendance'];
    if (postOnlyActions.includes(action) && method === 'GET') {
      // Tetap izinkan GET untuk backward compatibility, tapi log warning
      // Di masa depan bisa di-block sepenuhnya
      Logger.log('WARNING: Sensitive action ' + action + ' called via GET');
    }
    
    switch(action) {
      case 'login':
        result = login(e.parameter.nip, e.parameter.password);
        break;
      case 'getUsers':
        result = getUsers();
        break;
      case 'addUser':
        result = addUser(JSON.parse(e.parameter.data));
        break;
      case 'updateUser':
        result = updateUser(JSON.parse(e.parameter.data));
        break;
      case 'deleteUser':
        result = deleteUser(e.parameter.nip);
        break;
      case 'submitAttendance':
        result = submitAttendance(JSON.parse(e.parameter.data));
        break;
      case 'getAttendance':
        result = getAttendance(e.parameter.nip, e.parameter.date);
        break;
      case 'getAllAttendance':
        result = getAllAttendance(e.parameter.date);
        break;
      case 'getSettings':
        result = getSettings();
        break;
      case 'saveSettings':
        result = saveSettings(JSON.parse(e.parameter.data));
        break;
      case 'init':
        result = initSheets();
        break;
      case 'migratePasswords':
        result = migratePasswordsToHash();
        break;
      default:
        result = { success: false, message: 'Unknown action' };
    }
  } catch(error) {
    result = { success: false, message: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================
// PASSWORD HASHING (Bug #3 fix)
// =====================================================
function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  let hash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byte = rawHash[i];
    if (byte < 0) byte += 256;
    let hex = byte.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hash += hex;
  }
  return hash;
}

// Migrasi password lama (plain text) ke SHA-256
// Jalankan fungsi ini SEKALI setelah deploy kode baru
function migratePasswordsToHash() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  let migrated = 0;
  for (let i = 1; i < data.length; i++) {
    const currentPassword = String(data[i][2]);
    // Skip jika sudah berupa hash (64 karakter hex)
    if (currentPassword.length === 64 && /^[0-9a-f]+$/.test(currentPassword)) {
      continue;
    }
    // Hash password plain text
    const hashed = hashPassword(currentPassword);
    sheet.getRange(i + 1, 3).setValue(hashed);
    migrated++;
  }
  
  return { 
    success: true, 
    message: migrated + ' password berhasil di-migrate ke SHA-256' 
  };
}

// =====================================================
// INITIALIZATION
// =====================================================
function initSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Create Users sheet if not exists (Bug #15: tambah kolom kelas)
  let usersSheet = ss.getSheetByName(SHEET_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_USERS);
    usersSheet.appendRow(['nip', 'nama', 'password', 'role', 'foto', 'mapel', 'kelas']);
    // Add default admin (password di-hash)
    usersSheet.appendRow(['admin', 'Administrator', hashPassword('admin123'), 'admin', '', '', '']);
    usersSheet.appendRow(['1234567890', 'Budi Santoso, S.Pd', hashPassword('guru123'), 'guru', '', 'Matematika', '']);
  } else {
    // Cek apakah kolom kelas sudah ada, jika belum tambahkan
    const headers = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0];
    if (!headers.includes('kelas')) {
      const nextCol = usersSheet.getLastColumn() + 1;
      usersSheet.getRange(1, nextCol).setValue('kelas');
    }
  }
  
  // Create Attendance sheet if not exists
  let attendanceSheet = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!attendanceSheet) {
    attendanceSheet = ss.insertSheet(SHEET_ATTENDANCE);
    attendanceSheet.appendRow(['id', 'nip', 'nama', 'mapel', 'kelas', 'jam', 'status', 'keterangan', 'latitude', 'longitude', 'timestamp', 'tahunAjaran']);
  }
  
  // Create Settings sheet if not exists
  let settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
    settingsSheet.appendRow(['key', 'value']);
    settingsSheet.appendRow(['schoolName', 'SMA Negeri 1']);
    settingsSheet.appendRow(['principal', 'Dr. H. Ahmad Maulana, M.Pd']);
    settingsSheet.appendRow(['principalNip', '196507101990031002']);
    settingsSheet.appendRow(['address', 'Jl. Pendidikan No. 1']);
    settingsSheet.appendRow(['tahunAjaran', '2025/2026']);
  }
  
  return { success: true, message: 'Sheets initialized successfully' };
}

// =====================================================
// USER FUNCTIONS
// =====================================================
function login(nip, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  // Bug #3 fix: Hash password yang dikirim untuk dibandingkan
  const hashedPassword = hashPassword(password);
  
  for (let i = 1; i < data.length; i++) {
    const storedNip = String(data[i][0]);
    const storedPassword = String(data[i][2]);
    
    if (storedNip == String(nip)) {
      // Cek dengan hash password
      if (storedPassword === hashedPassword) {
        return {
          success: true,
          user: {
            nip: data[i][0],
            nama: data[i][1],
            role: data[i][3],
            foto: data[i][4] || '',
            mapel: data[i][5] || '',
            kelas: data[i][6] || ''
          }
        };
      }
      // Backward compatibility: cek juga plain text (untuk sebelum migrasi)
      if (storedPassword === password) {
        // Auto-migrate password ke hash
        sheet.getRange(i + 1, 3).setValue(hashedPassword);
        return {
          success: true,
          user: {
            nip: data[i][0],
            nama: data[i][1],
            role: data[i][3],
            foto: data[i][4] || '',
            mapel: data[i][5] || '',
            kelas: data[i][6] || ''
          }
        };
      }
    }
  }
  
  return { success: false, message: 'NIP atau Password salah' };
}

function getUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  const users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      nip: data[i][0],
      nama: data[i][1],
      // Bug #2 fix: TIDAK mengirim password ke frontend
      role: data[i][3],
      foto: data[i][4] || '',
      mapel: data[i][5] || '',
      kelas: data[i][6] || ''
    });
  }
  
  return { success: true, users: users };
}

function addUser(userData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  
  // Check if NIP already exists
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) == String(userData.nip)) {
      return { success: false, message: 'NIP sudah terdaftar' };
    }
  }
  
  // Bug #3 fix: Hash password sebelum simpan
  const hashedPassword = hashPassword(userData.password);
  
  // Bug #15 fix: Simpan data kelas
  sheet.appendRow([
    userData.nip,
    userData.nama,
    hashedPassword,
    userData.role || 'guru',
    userData.foto || '',
    userData.mapel || '',
    userData.kelas || ''
  ]);
  
  return { success: true, message: 'User berhasil ditambahkan' };
}

function updateUser(userData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) == String(userData.oldNip) || String(data[i][0]) == String(userData.nip)) {
      sheet.getRange(i + 1, 1).setValue(userData.nip);
      sheet.getRange(i + 1, 2).setValue(userData.nama);
      if (userData.password) {
        // Bug #3 fix: Hash password baru
        sheet.getRange(i + 1, 3).setValue(hashPassword(userData.password));
      }
      sheet.getRange(i + 1, 4).setValue(userData.role);
      if (userData.foto) {
        sheet.getRange(i + 1, 5).setValue(userData.foto);
      }
      if (userData.mapel !== undefined) {
        sheet.getRange(i + 1, 6).setValue(userData.mapel);
      }
      // Bug #15 fix: Update kelas
      if (userData.kelas !== undefined) {
        sheet.getRange(i + 1, 7).setValue(userData.kelas);
      }
      return { success: true, message: 'User berhasil diupdate' };
    }
  }
  
  return { success: false, message: 'User tidak ditemukan' };
}

function deleteUser(nip) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) == String(nip)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'User berhasil dihapus' };
    }
  }
  
  return { success: false, message: 'User tidak ditemukan' };
}

// Fungsi untuk verifikasi password lama (digunakan saat ganti password)
function verifyPassword(nip, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  
  const hashedPassword = hashPassword(password);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) == String(nip)) {
      const storedPassword = String(data[i][2]);
      return storedPassword === hashedPassword || storedPassword === password;
    }
  }
  return false;
}

// =====================================================
// ATTENDANCE FUNCTIONS
// =====================================================
function submitAttendance(record) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  
  const id = 'ATT' + new Date().getTime();
  const timestamp = new Date().toISOString();
  
  // Get tahun ajaran from settings
  const settings = getSettings();
  const tahunAjaran = settings.settings.tahunAjaran || '2025/2026';
  
  sheet.appendRow([
    id,
    record.nip,
    record.nama,
    record.mapel || '',
    record.kelas,
    record.jam,
    record.status,
    record.keterangan || '',
    record.latitude || '',
    record.longitude || '',
    timestamp,
    tahunAjaran
  ]);
  
  return { 
    success: true, 
    message: 'Absensi berhasil disimpan',
    id: id,
    timestamp: timestamp
  };
}

function getAttendance(nip, date) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  
  // Detect if mapel column exists (check header)
  const headers = data[0];
  const hasMapelColumn = headers.includes('mapel');
  
  // Column indices based on whether mapel column exists
  const cols = hasMapelColumn ? {
    id: 0, nip: 1, nama: 2, mapel: 3, kelas: 4, jam: 5, 
    status: 6, keterangan: 7, latitude: 8, longitude: 9, 
    timestamp: 10, tahunAjaran: 11
  } : {
    id: 0, nip: 1, nama: 2, kelas: 3, jam: 4, 
    status: 5, keterangan: 6, latitude: 7, longitude: 8, 
    timestamp: 9, tahunAjaran: 10
  };
  
  const records = [];
  for (let i = 1; i < data.length; i++) {
    const recordDate = data[i][cols.timestamp] ? data[i][cols.timestamp].toString().substring(0, 10) : '';
    const matchNip = !nip || String(data[i][cols.nip]) == String(nip);
    const matchDate = !date || recordDate.startsWith(date);
    
    if (matchNip && matchDate) {
      records.push({
        id: data[i][cols.id],
        nip: data[i][cols.nip],
        nama: data[i][cols.nama],
        mapel: hasMapelColumn ? data[i][cols.mapel] : '',
        kelas: data[i][cols.kelas],
        jam: data[i][cols.jam],
        status: data[i][cols.status],
        keterangan: data[i][cols.keterangan],
        latitude: data[i][cols.latitude],
        longitude: data[i][cols.longitude],
        timestamp: data[i][cols.timestamp],
        tahunAjaran: data[i][cols.tahunAjaran]
      });
    }
  }
  
  // Sort by timestamp descending
  records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return { success: true, records: records };
}

function getAllAttendance(date) {
  return getAttendance(null, date);
}

// =====================================================
// SETTINGS FUNCTIONS
// =====================================================
function getSettings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  
  return { success: true, settings: settings };
}

function saveSettings(newSettings) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  for (const key in newSettings) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == key) {
        sheet.getRange(i + 1, 2).setValue(newSettings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, newSettings[key]]);
    }
  }
  
  return { success: true, message: 'Settings berhasil disimpan' };
}
