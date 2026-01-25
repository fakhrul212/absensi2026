// ===================== Auth Module (Online Version) =====================

let currentUser = null;

function initAuth() {
    // Check for saved session
    const savedUser = localStorage.getItem('currentUser');
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

function redirectToDashboard() {
    if (!currentUser) return;

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
