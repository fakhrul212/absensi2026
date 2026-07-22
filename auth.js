// ===================== Auth Module (Online Version) =====================

let currentUser = null;
let adminRefreshInterval = null; // Bug #11 fix: track interval ID

function initAuth() {
    // Bug #5 fix: Check both localStorage AND sessionStorage
    const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // Verify API is configured before redirecting
        if (isAPIConfigured()) {
            redirectToDashboard();
        }
    }

    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(e) {
    e.preventDefault();

    if (!isAPIConfigured()) {
        openModal('configModal');
        return;
    }

    const nip = document.getElementById('loginNip').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    submitBtn.disabled = true;

    try {
        const result = await apiLogin(nip, password);

        if (result.success) {
            currentUser = result.user;

            if (rememberMe) {
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            } else {
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            }

            hideLoginError();
            redirectToDashboard();
        } else {
            showLoginError(result.message || 'NIP atau Password salah!');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Gagal terhubung ke server. Cek koneksi internet Anda.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function redirectToDashboard() {
    if (!currentUser) return;

    // Load daftar kelas dari server sebelum render dashboard
    await loadKelasList();

    if (currentUser.role === 'admin') {
        showPage('adminPage');
        initAdminDashboard();
    } else {
        showPage('guruPage');
        initGuruDashboard();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');

    // Bug #11 fix: Clear interval timer
    if (adminRefreshInterval) {
        clearInterval(adminRefreshInterval);
        adminRefreshInterval = null;
    }

    // Bug #13 fix: Destroy Leaflet map
    if (typeof schoolMap !== 'undefined' && schoolMap) {
        schoolMap.remove();
        schoolMap = null;
        schoolMarker = null;
        radiusCircle = null;
    }

    // Reset forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();

    // Reset scanner
    if (typeof stopQRScanner === 'function') {
        stopQRScanner();
    }
    if (typeof resetScannerState === 'function') {
        resetScannerState();
    }

    // Reset admin page innerHTML so it re-renders on next login
    const adminPage = document.getElementById('adminPage');
    if (adminPage) adminPage.innerHTML = '';

    // Bug #8 fix: Clear data caches
    if (typeof clearDataCaches === 'function') {
        clearDataCaches();
    }

    showPage('loginPage');
}

function getCurrentUser() {
    if (!currentUser) {
        const saved = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (saved) {
            currentUser = JSON.parse(saved);
        }
    }
    return currentUser;
}

// Fungsi untuk refresh data user dari server (termasuk mapel)
async function refreshCurrentUser() {
    const user = getCurrentUser();
    if (!user || !user.nip) return null;

    try {
        const result = await apiGetUsers();
        console.log('API getUsers result:', result);

        if (result.success && result.users) {
            // Konversi NIP ke string untuk perbandingan yang benar (Bug #7 fix)
            const userNip = String(user.nip);
            const updatedUser = result.users.find(u => String(u.nip) === userNip);

            if (updatedUser) {
                // Update currentUser dengan data terbaru
                currentUser = {
                    nip: updatedUser.nip,
                    nama: updatedUser.nama,
                    role: updatedUser.role,
                    foto: updatedUser.foto || '',
                    mapel: updatedUser.mapel || '',
                    kelas: updatedUser.kelas || ''
                };

                // Update localStorage/sessionStorage
                if (localStorage.getItem('currentUser')) {
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                } else {
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                }

                console.log('User data refreshed with mapel:', currentUser.mapel);
                return currentUser;
            }
        }
    } catch (error) {
        console.error('Error refreshing user data:', error);
    }
    return user;
}

function showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function hideLoginError() {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const btn = input.nextElementSibling;
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
