// ===================== Main App Controller (Online Version) =====================

document.addEventListener('DOMContentLoaded', function () {
    // Initialize data and check API
    initData();

    // Initialize authentication
    initAuth();

    // Render modals
    renderModals();
});

// ===================== API Configuration =====================
async function saveApiConfig() {
    const url = document.getElementById('configApiUrl').value.trim();

    if (!url || !url.startsWith('https://script.google.com')) {
        showAlert('Error', 'Masukkan URL Google Apps Script yang valid!', 'danger');
        return;
    }

    setAPIUrl(url);
    closeModal('configModal');

    // Try to initialize sheets
    showAlert('Info', 'Menginisialisasi database...', 'info');

    try {
        const result = await apiInitSheets();
        if (result.success) {
            showAlert('Berhasil', 'Koneksi berhasil! Silakan login.', 'success');
        } else {
            showAlert('Warning', 'Koneksi tersambung. ' + (result.message || ''), 'warning');
        }
    } catch (e) {
        showAlert('Info', 'URL disimpan. Silakan login untuk test koneksi.', 'info');
    }
}

// ===================== Page Navigation =====================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ===================== Guru Dashboard =====================
async function initGuruDashboard() {
    const guruPage = document.getElementById('guruPage');
    guruPage.innerHTML = renderGuruPage();

    // Initialize GPS
    initGPS();

    // Initialize attendance form
    initAttendance();

    // Setup tab navigation
    setupGuruTabs();

    // Load riwayat
    loadRiwayatAbsensi();

    // Refresh user data dari server untuk memastikan mapel up-to-date
    try {
        const updatedUser = await refreshCurrentUser();
        if (updatedUser) {
            // Update tampilan mapel di navbar
            const guruMapelEl = document.getElementById('guruMapel');
            if (guruMapelEl) {
                guruMapelEl.textContent = updatedUser.mapel || '-';
            }
            // Update nama juga jika berubah
            const guruNameEl = document.getElementById('guruName');
            if (guruNameEl) {
                guruNameEl.textContent = updatedUser.nama;
            }
            console.log('Mapel guru:', updatedUser.mapel);
        }
    } catch (error) {
        console.error('Error refreshing user:', error);
    }
}

function setupGuruTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab' + tabId.charAt(0).toUpperCase() + tabId.slice(1)).classList.add('active');

            if (tabId === 'riwayat') {
                loadRiwayatAbsensi();
            }
        });
    });
}

// ===================== Modal Functions =====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// Close modal on outside click
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal') && e.target.id !== 'configModal') {
        e.target.classList.remove('active');
    }
});

// ===================== Alert Function =====================
function showAlert(title, message, type = 'info') {
    const alertModal = document.getElementById('alertModal');
    const alertIcon = document.getElementById('alertIcon');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');

    let iconClass = 'fa-info-circle';
    let iconColor = 'var(--accent-primary)';

    switch (type) {
        case 'success':
            iconClass = 'fa-check-circle';
            iconColor = 'var(--success)';
            break;
        case 'warning':
            iconClass = 'fa-exclamation-triangle';
            iconColor = 'var(--warning)';
            break;
        case 'danger':
            iconClass = 'fa-times-circle';
            iconColor = 'var(--danger)';
            break;
    }

    alertIcon.innerHTML = `<i class="fas ${iconClass}" style="color: ${iconColor}"></i>`;
    alertTitle.textContent = title;
    alertMessage.textContent = message;

    openModal('alertModal');
}

// ===================== Checkbox Helper Functions =====================
function selectAllKelas(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    checkboxes.forEach(cb => cb.checked = true);
}

function deselectAllKelas(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    checkboxes.forEach(cb => cb.checked = false);
}

function selectAllJam() {
    const checkboxes = document.querySelectorAll('input[name="jamMengajar"]');
    checkboxes.forEach(cb => cb.checked = true);
}

function deselectAllJam() {
    const checkboxes = document.querySelectorAll('input[name="jamMengajar"]');
    checkboxes.forEach(cb => cb.checked = false);
}

