// ===================== Admin Module (Online Version) =====================

async function initAdminDashboard() {
    const adminPage = document.getElementById('adminPage');
    if (!adminPage.innerHTML.trim()) {
        adminPage.innerHTML = renderAdminPage();
    }

    const user = getCurrentUser();
    if (user) {
        const avatar = user.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=f43f5e&color=fff`;

        const adminName = document.getElementById('adminName');
        const adminAvatar = document.getElementById('adminAvatar');
        const settingsAvatar = document.getElementById('settingsAvatar');
        const adminDisplayName = document.getElementById('adminDisplayName');

        if (adminName) adminName.textContent = user.nama;
        if (adminAvatar) adminAvatar.src = avatar;
        if (settingsAvatar) settingsAvatar.src = avatar;
        if (adminDisplayName) adminDisplayName.value = user.nama;
    }

    // Load school profile
    try {
        const school = await getSchoolProfile();
        const schoolName = document.getElementById('schoolName');
        const principalName = document.getElementById('principalName');
        const principalNip = document.getElementById('principalNip');
        const schoolAddress = document.getElementById('schoolAddress');
        const tahunAjaran = document.getElementById('tahunAjaran');

        if (schoolName) schoolName.value = school.name || '';
        if (principalName) principalName.value = school.principal || '';
        if (principalNip) principalNip.value = school.principalNip || '';
        if (schoolAddress) schoolAddress.value = school.address || '';
        if (tahunAjaran) tahunAjaran.value = school.tahunAjaran || '';
    } catch (e) {
        console.error('Error loading school profile:', e);
    }

    // Setup menu navigation
    setupAdminMenu();

    // Load dashboard data
    await updateDashboardStats();
    await loadRecentAbsensi();
    await loadUserList();
    await updateMonitoring();

    // Check empty classes real-time
    await checkEmptyClassesRealtime();

    // Bug #11 fix: Clear old interval before creating new one
    if (adminRefreshInterval) {
        clearInterval(adminRefreshInterval);
    }
    // Auto-refresh empty class notification every 5 minutes
    adminRefreshInterval = setInterval(checkEmptyClassesRealtime, 5 * 60 * 1000);

    // Set default dates
    const emptyClassDate = document.getElementById('emptyClassDate');
    const reportMonth = document.getElementById('reportMonth');
    if (emptyClassDate) emptyClassDate.value = getTodayDate();
    if (reportMonth) reportMonth.value = getTodayDate().substring(0, 7);
}


function setupAdminMenu() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const menuId = item.dataset.menu;
            document.querySelectorAll('.menu-content').forEach(c => c.classList.remove('active'));
            document.getElementById('menu' + menuId.charAt(0).toUpperCase() + menuId.slice(1)).classList.add('active');
        });
    });
}

async function updateDashboardStats() {
    try {
        const users = await getUsers();
        const guruCount = users.filter(u => u.role === 'guru').length;
        const today = getTodayDate();
        const todayRecords = await getAttendance('', today);

        const hadirToday = new Set(todayRecords.filter(r => r.status === 'masuk').map(r => r.nip)).size;
        const izinToday = new Set(todayRecords.filter(r => r.status === 'izin').map(r => r.nip)).size;

        document.getElementById('totalGuru').textContent = guruCount;
        document.getElementById('totalHadir').textContent = hadirToday;
        document.getElementById('totalIzin').textContent = izinToday;
        document.getElementById('totalAbsen').textContent = Math.max(0, guruCount - hadirToday - izinToday);
    } catch (e) {
        console.error('Error updating stats:', e);
    }
}

async function loadRecentAbsensi() {
    const tbody = document.getElementById('recentAbsensi');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

    try {
        const records = await getAttendance('', '');
        console.log('Records loaded:', records); // Debug log

        if (!records || records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Belum ada data</td></tr>';
            return;
        }

        const recent = records.slice(0, 10);

        tbody.innerHTML = recent.map(r => {
            // Handle null/undefined values safely
            const timestamp = r.timestamp ? formatDateTime(r.timestamp) : '-';
            const nama = r.nama || '-';
            const mapel = r.mapel || '-';
            const kelas = r.kelas || '-';
            const jam = r.jam !== undefined ? r.jam : '-';
            const status = String(r.status || 'unknown').toLowerCase();

            return `
            <tr>
                <td>${timestamp}</td>
                <td>${nama}</td>
                <td>${mapel}</td>
                <td>${kelas}</td>
                <td>Jam ke-${jam}</td>
                <td><span class="riwayat-status ${status}">${status.toUpperCase()}</span></td>
            </tr>
        `}).join('');
    } catch (e) {
        console.error('Error in loadRecentAbsensi:', e);
        // Bug #12 fix: Sanitasi error message untuk mencegah XSS
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger)">Gagal memuat data: ' + escapeHtml(e.message || 'Unknown error') + '</td></tr>';
    }
}

async function loadUserList() {
    const tbody = document.getElementById('userList');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

    try {
        const users = await getUsers();
        tbody.innerHTML = users.map(u => {
            const role = String(u.role || 'guru').toLowerCase();
            return `
            <tr>
                <td>${u.nip}</td>
                <td>${u.nama}</td>
                <td>${u.mapel || '-'}</td>
                <td><span class="riwayat-status ${role === 'admin' ? 'izin' : 'masuk'}">${role.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="editUser(${JSON.stringify(String(u.nip))})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser(${JSON.stringify(String(u.nip))})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger)">Gagal memuat data</td></tr>';
    }
}

// User Management
async function addUser(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    // Get selected kelas from checkboxes
    const kelasCheckboxes = document.querySelectorAll('input[name="addKelas"]:checked');
    const selectedKelas = Array.from(kelasCheckboxes).map(cb => cb.value);

    const newUser = {
        nip: document.getElementById('addNip').value.trim(),
        nama: document.getElementById('addNama').value.trim(),
        password: document.getElementById('addPassword').value,
        mapel: document.getElementById('addMapel').value.trim(),
        role: document.getElementById('addRole').value,
        kelas: selectedKelas.join(', ')
    };

    try {
        const result = await addUserToSheet(newUser);
        if (result.success) {
            closeModal('addUserModal');
            document.getElementById('addUserForm').reset();
            await loadUserList();
            await updateDashboardStats();
            showAlert('Berhasil', 'User berhasil ditambahkan!', 'success');
        } else {
            showAlert('Error', result.message, 'danger');
        }
    } catch (e) {
        showAlert('Error', 'Gagal menambah user', 'danger');
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
        btn.disabled = false;
    }
}

async function editUser(nip) {
    const users = await getUsers();
    // Bug #7 fix: gunakan String() untuk perbandingan konsisten
    const user = users.find(u => String(u.nip) === String(nip));
    if (!user) return;

    document.getElementById('editNipOld').value = user.nip;
    document.getElementById('editNip').value = user.nip;
    document.getElementById('editNama').value = user.nama;
    document.getElementById('editPassword').value = '';
    document.getElementById('editMapel').value = user.mapel || '';
    document.getElementById('editRole').value = user.role;

    // Set kelas checkboxes based on user's kelas
    const userKelas = user.kelas ? user.kelas.split(',').map(k => k.trim()) : [];
    const kelasCheckboxes = document.querySelectorAll('input[name="editKelas"]');
    kelasCheckboxes.forEach(cb => {
        cb.checked = userKelas.includes(cb.value);
    });

    openModal('editUserModal');
}

async function updateUser(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    btn.disabled = true;

    // Get selected kelas from checkboxes
    const kelasCheckboxes = document.querySelectorAll('input[name="editKelas"]:checked');
    const selectedKelas = Array.from(kelasCheckboxes).map(cb => cb.value);

    const userData = {
        oldNip: document.getElementById('editNipOld').value,
        nip: document.getElementById('editNip').value.trim(),
        nama: document.getElementById('editNama').value.trim(),
        password: document.getElementById('editPassword').value || null,
        mapel: document.getElementById('editMapel').value.trim(),
        role: document.getElementById('editRole').value,
        kelas: selectedKelas.join(', ')
    };

    try {
        const result = await updateUserInSheet(userData);
        if (result.success) {
            closeModal('editUserModal');
            await loadUserList();
            showAlert('Berhasil', 'User berhasil diupdate!', 'success');
        } else {
            showAlert('Error', result.message, 'danger');
        }
    } catch (e) {
        showAlert('Error', 'Gagal update user', 'danger');
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Update';
        btn.disabled = false;
    }
}

async function deleteUser(nip) {
    if (!confirm('Yakin ingin menghapus user ini?')) return;

    try {
        const result = await deleteUserFromSheet(nip);
        if (result.success) {
            await loadUserList();
            await updateDashboardStats();
            showAlert('Berhasil', 'User berhasil dihapus!', 'success');
        } else {
            showAlert('Error', result.message, 'danger');
        }
    } catch (e) {
        showAlert('Error', 'Gagal hapus user', 'danger');
    }
}

async function importUsers() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];

    if (!file) {
        showAlert('Perhatian', 'Pilih file CSV terlebih dahulu!', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const text = e.target.result;
        const lines = text.split('\n');
        let added = 0;

        for (let idx = 0; idx < lines.length; idx++) {
            const line = lines[idx];
            if (idx === 0 || !line.trim()) continue;
            const [nip, nama, password, role, mapel] = line.split(',').map(s => s.trim());
            if (nip && nama && password) {
                const result = await addUserToSheet({ nip, nama, password, role: role || 'guru', mapel: mapel || '' });
                if (result.success) added++;
            }
        }

        closeModal('importUserModal');
        fileInput.value = '';
        await loadUserList();
        await updateDashboardStats();
        showAlert('Berhasil', `${added} user berhasil diimport!`, 'success');
    };
    reader.readAsText(file);
}

// Monitoring
async function updateMonitoring() {
    const jam = document.getElementById('monitorJam')?.value || '';
    const today = getTodayDate();

    const container = document.getElementById('monitoringGrid');
    if (!container) return;

    container.innerHTML = '<div style="grid-column:1/-1;text-align:center"><i class="fas fa-spinner fa-spin"></i> Memuat...</div>';

    try {
        const records = await getAttendance('', today);

        // Pisahkan kelas reguler dan ruangan khusus
        const RUANGAN_KHUSUS = ['MUSHOLLA', 'LAPANGAN. DALAM', 'LAPANGAN. LUAR', 'PERPUSTAKAAN', 'LAB KOMPUTER', 'RUANG AGAMA HINDU', 'UPACARA BENDERA'];
        const kelasReguler = KELAS_LIST.filter(k => !RUANGAN_KHUSUS.includes(k));
        const ruanganKhusus = KELAS_LIST.filter(k => RUANGAN_KHUSUS.includes(k));

        // Normalize kelas name for matching (trim whitespace, normalize dots/spaces)
        function normalizeKelas(name) {
            return String(name || '').trim().replace(/\s+/g, ' ').toUpperCase();
        }

        function renderClassCards(kelasList) {
            return kelasList.map(kelas => {
                const normalizedKelas = normalizeKelas(kelas);
                const kelasRecords = records.filter(r => {
                    const recordKelas = normalizeKelas(r.kelas);
                    return (recordKelas === normalizedKelas) && (jam === '' || r.jam == jam);
                });
                const isFilled = kelasRecords.length > 0;
                const teacher = isFilled ? kelasRecords[0].nama : '';
                const mapel = isFilled ? (kelasRecords[0].mapel || '') : '';

                return `
                    <div class="class-card glass ${isFilled ? 'filled' : 'empty'}">
                        <div class="class-name">${kelas}</div>
                        <div class="class-status">${isFilled ? 'Terisi' : 'Kosong'}</div>
                        ${teacher ? `<div class="class-teacher">${teacher.split(',')[0]}</div>` : ''}
                        ${mapel ? `<div class="class-mapel"><small>${mapel}</small></div>` : ''}
                    </div>
                `;
            }).join('');
        }

        let html = '';
        html += '<div style="grid-column:1/-1"><h3 style="color:var(--text-primary);margin-bottom:10px"><i class="fas fa-school"></i> Kelas Reguler</h3></div>';
        html += renderClassCards(kelasReguler);
        html += '<div style="grid-column:1/-1;margin-top:20px"><h3 style="color:var(--text-primary);margin-bottom:10px"><i class="fas fa-door-open"></i> Ruangan Khusus</h3></div>';
        html += renderClassCards(ruanganKhusus);

        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--danger)">Gagal memuat data</div>';
    }
}

function refreshMonitoring() {
    updateMonitoring();
    showAlert('Info', 'Data monitoring telah diperbarui.', 'success');
}

// Search
async function searchGuruFunc() {
    const searchInput = document.getElementById('searchGuru');
    const container = document.getElementById('searchResults');

    if (!searchInput || !container) {
        console.error('Search elements not found');
        return;
    }

    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Ketik nama atau NIP untuk mencari</p></div>';
        return;
    }

    // Show loading
    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Mencari...</p></div>';

    try {
        const users = await getUsers();
        const results = users.filter(u => {
            if (u.role !== 'guru') return false;
            const nipStr = String(u.nip || '').toLowerCase();
            const namaStr = String(u.nama || '').toLowerCase();
            const mapelStr = String(u.mapel || '').toLowerCase();
            return namaStr.includes(query) || nipStr.includes(query) || mapelStr.includes(query);
        });

        if (results.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i><p>Tidak ditemukan</p></div>';
            return;
        }

        container.innerHTML = results.map(u => `
            <div class="search-result-item glass">
                <img src="${u.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nama)}&background=6366f1&color=fff`}" alt="Avatar">
                <div class="result-info">
                    <h4>${u.nama}</h4>
                    <p>NIP: ${u.nip}</p>
                    <p class="mapel-info"><i class="fas fa-book"></i> ${u.mapel || '-'}</p>
                </div>
                <div class="result-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewGuruDetail(${JSON.stringify(String(u.nip))})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Search error:', e);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Gagal mencari. Coba lagi.</p></div>';
    }
}

// View guru detail (show today's attendance)
async function viewGuruDetail(nip) {
    try {
        const users = await getUsers();
        const guru = users.find(u => String(u.nip) === String(nip));
        if (!guru) return;

        const today = getTodayDate();
        const records = await getAttendance(nip, today);

        let detailHtml = `
            <div class="guru-detail-card glass">
                <div class="guru-header">
                    <img src="${guru.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(guru.nama)}&background=6366f1&color=fff&size=100`}" alt="Avatar">
                    <div>
                        <h3>${guru.nama}</h3>
                        <p>NIP: ${guru.nip}</p>
                        <p class="mapel-info"><i class="fas fa-book"></i> ${guru.mapel || '-'}</p>
                    </div>
                </div>
                <div class="guru-attendance">
                    <h4><i class="fas fa-calendar-day"></i> Absensi Hari Ini</h4>
                    ${records.length > 0 ? records.map(r => {
            const status = String(r.status || '').toLowerCase();
            return `
                        <div class="attendance-item">
                            <span class="riwayat-status ${status}">${status.toUpperCase()}</span>
                            <span>${r.kelas} - Jam ke-${r.jam}</span>
                            <span class="time">${formatTime(r.timestamp)}</span>
                        </div>
                    `}).join('') : '<p class="no-data">Belum ada absensi hari ini</p>'}
                </div>
            </div>
        `;

        const container = document.getElementById('searchResults');
        container.innerHTML = `
            <button class="btn btn-secondary mb-20" onclick="searchGuruFunc()">
                <i class="fas fa-arrow-left"></i> Kembali ke Hasil Pencarian
            </button>
            ${detailHtml}
        `;
    } catch (e) {
        console.error('Error viewing guru detail:', e);
    }
}

// Empty Classes
async function findEmptyClasses() {
    const date = document.getElementById('emptyClassDate').value;
    const jam = document.getElementById('emptyClassJam').value;

    if (!date || jam === '') {
        showAlert('Perhatian', 'Pilih tanggal dan jam terlebih dahulu!', 'warning');
        return;
    }

    const container = document.getElementById('emptyClassResults');
    container.innerHTML = '<div style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Mencari...</div>';

    try {
        const records = await getAttendance('', date);
        const filtered = records.filter(r => r.jam == jam);
        const filledClasses = new Set(filtered.map(r => r.kelas));
        const emptyClasses = KELAS_LIST.filter(k => !filledClasses.has(k));

        container.innerHTML = emptyClasses.map(kelas => `
            <div class="class-card glass empty">
                <div class="class-name">${kelas}</div>
                <div class="class-status">Belum ada guru</div>
            </div>
        `).join('') || '<div class="card glass"><div class="card-body empty-state"><p>Semua kelas sudah terisi!</p></div></div>';
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;color:var(--danger)">Gagal mencari</div>';
    }
}

// Get current teaching hour based on time
function getCurrentJam() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes; // Time in minutes since midnight

    // Define teaching hours ranges (start and end in minutes)
    const jamRanges = [
        { jam: 0, start: 390, end: 449, label: 'Jam ke-0 (06:30 - 07:29)' },   // 06:30 - 07:29
        { jam: 1, start: 450, end: 490, label: 'Jam ke-1 (07:30 - 08:10)' },   // 07:30 - 08:10
        { jam: 2, start: 491, end: 530, label: 'Jam ke-2 (08:11 - 08:50)' },   // 08:11 - 08:50
        { jam: 3, start: 531, end: 570, label: 'Jam ke-3 (08:51 - 09:30)' },   // 08:51 - 09:30
        { jam: 4, start: 571, end: 610, label: 'Jam ke-4 (09:31 - 10:10)' },   // 09:31 - 10:10
        { jam: 5, start: 630, end: 670, label: 'Jam ke-5 (10:30 - 11:10)' },   // 10:30 - 11:10
        { jam: 6, start: 671, end: 710, label: 'Jam ke-6 (11:11 - 11:50)' },   // 11:11 - 11:50
        { jam: 7, start: 711, end: 750, label: 'Jam ke-7 (11:51 - 12:30)' },   // 11:51 - 12:30
        { jam: 8, start: 780, end: 820, label: 'Jam ke-8 (13:00 - 13:40)' },   // 13:00 - 13:40
        { jam: 9, start: 821, end: 860, label: 'Jam ke-9 (13:41 - 14:20)' }    // 13:41 - 14:20
    ];

    const found = jamRanges.find(j => currentTime >= j.start && currentTime <= j.end);
    return found || null;
}

// Check empty classes in real-time and display notification
async function checkEmptyClassesRealtime() {
    const notificationPanel = document.getElementById('emptyClassNotification');
    const jamLabel = document.getElementById('currentJamLabel');
    const alertContainer = document.getElementById('emptyClassAlert');

    if (!notificationPanel || !jamLabel || !alertContainer) return;

    const currentJamInfo = getCurrentJam();

    // If outside teaching hours, show info message instead of hiding
    if (!currentJamInfo) {
        notificationPanel.classList.remove('hidden');
        jamLabel.textContent = 'Di luar jam mengajar';
        alertContainer.innerHTML = `
            <div class="all-filled-message">
                <i class="fas fa-info-circle"></i>
                <span>Saat ini di luar jam mengajar. Monitoring akan aktif saat jam pelajaran berlangsung (06:30 - 14:20).</span>
            </div>
        `;
        return;
    }

    try {
        const today = getTodayDate();
        const records = await getAttendance('', today);

        // Normalize kelas name for matching
        function normalizeKelas(name) {
            return String(name || '').trim().replace(/\s+/g, ' ').toUpperCase();
        }

        const filtered = records.filter(r => r.jam == currentJamInfo.jam);
        const filledClassesNormalized = new Set(filtered.map(r => normalizeKelas(r.kelas)));

        // Only check regular classrooms (exclude special rooms)
        const RUANGAN_KHUSUS = ['MUSHOLLA', 'LAPANGAN. DALAM', 'LAPANGAN. LUAR', 'PERPUSTAKAAN', 'LAB KOMPUTER', 'RUANG AGAMA HINDU', 'UPACARA BENDERA'];
        const kelasReguler = KELAS_LIST.filter(k => !RUANGAN_KHUSUS.includes(k));
        const emptyClasses = kelasReguler.filter(k => !filledClassesNormalized.has(normalizeKelas(k)));

        // Update UI
        jamLabel.textContent = currentJamInfo.label;

        if (emptyClasses.length > 0) {
            notificationPanel.classList.remove('hidden');
            alertContainer.innerHTML = `
                <div class="empty-class-count">
                    <span class="count-number">${emptyClasses.length}</span>
                    <span class="count-label">Kelas Kosong (dari ${kelasReguler.length} kelas reguler)</span>
                </div>
                <div class="empty-class-tags">
                    ${emptyClasses.slice(0, 15).map(k => `<span class="empty-tag">${k}</span>`).join('')}
                    ${emptyClasses.length > 15 ? `<span class="empty-tag more">+${emptyClasses.length - 15} lainnya</span>` : ''}
                </div>
            `;
        } else {
            // Show success message when all classes are filled
            notificationPanel.classList.remove('hidden');
            alertContainer.innerHTML = `
                <div class="all-filled-message">
                    <i class="fas fa-check-circle"></i>
                    <span>Semua ${kelasReguler.length} kelas reguler sudah terisi pada ${currentJamInfo.label}!</span>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error checking empty classes:', e);
        notificationPanel.classList.remove('hidden');
        // Bug #12 fix: Sanitasi error message
        alertContainer.innerHTML = `
            <div class="all-filled-message" style="color:var(--danger)">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Gagal memuat data monitoring: ${escapeHtml(e.message || 'Periksa koneksi internet')}</span>
            </div>
        `;
    }
}


// Reports
async function generateWeeklyReport() {
    const week = document.getElementById('reportWeek').value;
    if (!week) {
        showAlert('Perhatian', 'Pilih minggu terlebih dahulu!', 'warning');
        return;
    }
    await generateReport('Mingguan', week);
}

async function generateMonthlyReport() {
    const month = document.getElementById('reportMonth').value;
    if (!month) {
        showAlert('Perhatian', 'Pilih bulan terlebih dahulu!', 'warning');
        return;
    }
    await generateReport('Bulanan', month);
}

async function generateReport(type, period) {
    const school = await getSchoolProfile();
    const records = await getAttendance('', '');

    // Bug #9 fix: Perbaiki filter laporan mingguan
    let filtered;
    if (type === 'Mingguan' && period.includes('W')) {
        // Format period: "2026-W18" → hitung tanggal awal dan akhir minggu
        const [yearStr, weekStr] = period.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);
        // Hitung tanggal Senin dari minggu tersebut
        const jan4 = new Date(year, 0, 4);
        const startOfWeek = new Date(jan4.getTime() + ((week - 1) * 7 - (jan4.getDay() || 7) + 1) * 86400000);
        const endOfWeek = new Date(startOfWeek.getTime() + 6 * 86400000);
        const startStr = startOfWeek.toISOString().split('T')[0];
        const endStr = endOfWeek.toISOString().split('T')[0];
        filtered = records.filter(r => {
            if (!r.timestamp) return false;
            const recDate = r.timestamp.toString().substring(0, 10);
            return recDate >= startStr && recDate <= endStr;
        });
    } else {
        // Bulanan: period = "2026-04"
        filtered = records.filter(r => r.timestamp && r.timestamp.toString().substring(0, 7) === period);
    }

    let content = `
        <html>
        <head><title>Laporan Absensi ${type}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1, h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background: #f0f0f0; }
            .header { text-align: center; margin-bottom: 20px; }
            .footer { margin-top: 40px; text-align: right; }
        </style>
        </head>
        <body>
            <div class="header">
                <h2>${school.name}</h2>
                <p>${school.address}</p>
                <h3>Laporan Absensi ${type} - ${period}</h3>
            </div>
            <table>
                <tr><th>No</th><th>Waktu</th><th>NIP</th><th>Nama</th><th>Mapel</th><th>Kelas</th><th>Jam</th><th>Status</th></tr>
                ${filtered.map((r, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${formatDateTime(r.timestamp)}</td>
                        <td>${r.nip}</td>
                        <td>${r.nama}</td>
                        <td>${r.mapel || '-'}</td>
                        <td>${r.kelas}</td>
                        <td>Jam ke-${r.jam}</td>
                        <td>${String(r.status || '').toUpperCase()}</td>
                    </tr>
                `).join('')}
            </table>
            <div class="footer">
                <p>Kepala Sekolah,</p><br><br><br>
                <p><u>${school.principal}</u></p>
                <p>NIP. ${school.principalNip}</p>
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(content);
    win.document.close();
    win.print();
}

// Settings
async function saveAdminProfile() {
    const user = getCurrentUser();
    const newName = document.getElementById('adminDisplayName').value.trim();

    const result = await updateUserInSheet({
        oldNip: user.nip,
        nip: user.nip,
        nama: newName,
        role: user.role
    });

    if (result.success) {
        user.nama = newName;
        localStorage.setItem('currentUser', JSON.stringify(user));
        document.getElementById('adminName').textContent = user.nama;
        showAlert('Berhasil', 'Profil admin berhasil disimpan!', 'success');
    } else {
        showAlert('Error', result.message, 'danger');
    }
}

function uploadAvatar(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        // Validasi tipe file
        if (!file.type.startsWith('image/')) {
            showAlert('Error', 'File harus berupa gambar!', 'danger');
            return;
        }

        // Validasi ukuran file (maksimal 5MB untuk file asli)
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxFileSize) {
            showAlert('Error', 'Ukuran file terlalu besar! Maksimal 5MB.', 'danger');
            return;
        }

        // Show loading
        showAlert('Info', 'Memproses foto...', 'info');

        const reader = new FileReader();
        reader.onload = async function (e) {
            // Resize dan compress gambar
            const resizedImage = await resizeAndCompressImage(e.target.result, 150, 150, 0.7);

            const user = getCurrentUser();
            const result = await updateUserInSheet({
                oldNip: user.nip,
                nip: user.nip,
                nama: user.nama,
                role: user.role,
                foto: resizedImage
            });

            if (result.success) {
                user.foto = resizedImage;
                localStorage.setItem('currentUser', JSON.stringify(user));
                document.getElementById('settingsAvatar').src = resizedImage;
                document.getElementById('adminAvatar').src = resizedImage;
                showAlert('Berhasil', 'Foto profil berhasil diupdate!', 'success');
            } else {
                showAlert('Error', result.message || 'Gagal mengupdate foto', 'danger');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Fungsi untuk resize dan compress gambar
function resizeAndCompressImage(base64, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function () {
            // Hitung dimensi baru (crop ke square)
            let size = Math.min(img.width, img.height);
            let sx = (img.width - size) / 2;
            let sy = (img.height - size) / 2;

            // Buat canvas
            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = maxHeight;
            const ctx = canvas.getContext('2d');

            // Gambar dengan crop ke tengah dan resize
            ctx.drawImage(img, sx, sy, size, size, 0, 0, maxWidth, maxHeight);

            // Convert ke JPEG dengan kualitas tertentu
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        img.src = base64;
    });
}

async function changePassword(e) {
    e.preventDefault();
    const oldPass = document.getElementById('oldPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (newPass !== confirmPass) {
        showAlert('Error', 'Password baru dan konfirmasi tidak sama!', 'danger');
        return;
    }

    const user = getCurrentUser();

    // Bug #2 fix: Password sudah tidak ada di response getUsers,
    // jadi verifikasi password lama dilakukan via login API
    try {
        const verifyResult = await apiLogin(user.nip, oldPass);
        if (!verifyResult.success) {
            showAlert('Error', 'Password lama salah!', 'danger');
            return;
        }
    } catch (err) {
        showAlert('Error', 'Gagal memverifikasi password lama', 'danger');
        return;
    }

    const result = await updateUserInSheet({
        oldNip: user.nip,
        nip: user.nip,
        nama: user.nama,
        password: newPass,
        role: user.role
    });

    if (result.success) {
        document.getElementById('changePasswordForm').reset();
        showAlert('Berhasil', 'Password berhasil diubah!', 'success');
    } else {
        showAlert('Error', result.message, 'danger');
    }
}

async function saveTahunAjaran() {
    const tahun = document.getElementById('tahunAjaran').value.trim();
    const result = await apiSaveSettings({ tahunAjaran: tahun });
    if (result.success) {
        showAlert('Berhasil', 'Tahun ajaran berhasil disimpan!', 'success');
    } else {
        showAlert('Error', 'Gagal menyimpan', 'danger');
    }
}

async function saveSchoolProfileForm(e) {
    e.preventDefault();

    const profile = {
        name: document.getElementById('schoolName').value.trim(),
        principal: document.getElementById('principalName').value.trim(),
        principalNip: document.getElementById('principalNip').value.trim(),
        address: document.getElementById('schoolAddress').value.trim(),
        tahunAjaran: document.getElementById('tahunAjaran')?.value.trim() || ''
    };

    const result = await saveSchoolProfileData(profile);
    if (result.success) {
        showAlert('Berhasil', 'Profil sekolah berhasil disimpan!', 'success');
    } else {
        showAlert('Error', result.message || 'Gagal menyimpan', 'danger');
    }
}

// ===================== GPS Radius Settings =====================
let schoolMap = null;
let schoolMarker = null;
let radiusCircle = null;

function initGpsRadiusMap() {
    // Check if Leaflet library is loaded
    if (typeof L === 'undefined') {
        console.warn('Leaflet library not loaded');
        return;
    }

    // Check if map container exists and map not initialized
    const mapContainer = document.getElementById('schoolMap');
    if (!mapContainer || schoolMap) return;

    // Load saved settings
    const savedSettings = loadGpsSettings();
    const lat = savedSettings.latitude || -8.5833;
    const lng = savedSettings.longitude || 116.1167;
    const radius = savedSettings.maxRadius || 500;

    // Initialize map
    schoolMap = L.map('schoolMap').setView([lat, lng], 16);

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(schoolMap);

    // Add marker
    schoolMarker = L.marker([lat, lng], { draggable: true }).addTo(schoolMap);
    schoolMarker.bindPopup('Lokasi Sekolah').openPopup();

    // Add radius circle
    radiusCircle = L.circle([lat, lng], {
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.2,
        radius: radius
    }).addTo(schoolMap);

    // Update form values
    document.getElementById('schoolLat').value = lat;
    document.getElementById('schoolLng').value = lng;
    document.getElementById('schoolRadius').value = radius;
    document.getElementById('radiusSlider').value = Math.min(radius, 2000);
    document.getElementById('enableRadiusCheck').checked = savedSettings.enableRadiusCheck || false;
    updateRadiusStatus();

    // Map click event
    schoolMap.on('click', function (e) {
        const { lat, lng } = e.latlng;
        updateMapLocation(lat, lng);
    });

    // Marker drag event
    schoolMarker.on('dragend', function (e) {
        const { lat, lng } = e.target.getLatLng();
        updateMapLocation(lat, lng);
    });

    // Form input events
    document.getElementById('schoolLat').addEventListener('change', updateMapFromForm);
    document.getElementById('schoolLng').addEventListener('change', updateMapFromForm);
    document.getElementById('schoolRadius').addEventListener('change', updateRadiusFromInput);
}

function updateMapLocation(lat, lng) {
    schoolMarker.setLatLng([lat, lng]);
    radiusCircle.setLatLng([lat, lng]);
    document.getElementById('schoolLat').value = lat.toFixed(6);
    document.getElementById('schoolLng').value = lng.toFixed(6);
}

function updateMapFromForm() {
    const lat = parseFloat(document.getElementById('schoolLat').value) || 0;
    const lng = parseFloat(document.getElementById('schoolLng').value) || 0;
    if (lat && lng) {
        schoolMarker.setLatLng([lat, lng]);
        radiusCircle.setLatLng([lat, lng]);
        schoolMap.setView([lat, lng], 16);
    }
}

function updateRadiusFromSlider() {
    const radius = parseInt(document.getElementById('radiusSlider').value);
    document.getElementById('schoolRadius').value = radius;
    if (radiusCircle) {
        radiusCircle.setRadius(radius);
    }
}

function updateRadiusFromInput() {
    const radius = parseInt(document.getElementById('schoolRadius').value) || 500;
    document.getElementById('radiusSlider').value = Math.min(radius, 2000);
    if (radiusCircle) {
        radiusCircle.setRadius(radius);
    }
}

function toggleRadiusCheck() {
    updateRadiusStatus();
}

function updateRadiusStatus() {
    const enabled = document.getElementById('enableRadiusCheck').checked;
    document.getElementById('radiusStatus').textContent = enabled ? 'Aktif' : 'Nonaktif';
    document.getElementById('radiusStatus').style.color = enabled ? 'var(--success)' : 'var(--text-secondary)';
}

function getMyLocation() {
    if (!navigator.geolocation) {
        showAlert('Error', 'Browser tidak mendukung GPS', 'danger');
        return;
    }

    showAlert('Info', 'Mendeteksi lokasi...', 'info');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            updateMapLocation(lat, lng);
            schoolMap.setView([lat, lng], 16);
            showAlert('Berhasil', 'Lokasi berhasil dideteksi!', 'success');
        },
        (error) => {
            showAlert('Error', 'Gagal mendapatkan lokasi. Pastikan GPS aktif.', 'danger');
        },
        { enableHighAccuracy: true }
    );
}

async function saveGpsSettings() {
    const settings = {
        enableRadiusCheck: document.getElementById('enableRadiusCheck').checked,
        latitude: parseFloat(document.getElementById('schoolLat').value) || 0,
        longitude: parseFloat(document.getElementById('schoolLng').value) || 0,
        maxRadius: parseInt(document.getElementById('schoolRadius').value) || 500
    };

    // Save to localStorage
    localStorage.setItem('gpsSettings', JSON.stringify(settings));

    // Bug #6 fix: Juga simpan ke server agar sinkron antar device
    try {
        await apiSaveSettings({
            gpsEnableRadius: settings.enableRadiusCheck.toString(),
            gpsLatitude: settings.latitude.toString(),
            gpsLongitude: settings.longitude.toString(),
            gpsMaxRadius: settings.maxRadius.toString()
        });
    } catch (e) {
        console.error('Error saving GPS to server:', e);
    }

    // Update gps.js SCHOOL_CONFIG
    if (typeof SCHOOL_CONFIG !== 'undefined') {
        SCHOOL_CONFIG.enableRadiusCheck = settings.enableRadiusCheck;
        SCHOOL_CONFIG.latitude = settings.latitude;
        SCHOOL_CONFIG.longitude = settings.longitude;
        SCHOOL_CONFIG.maxRadius = settings.maxRadius;
    }

    showAlert('Berhasil', 'Pengaturan GPS berhasil disimpan!', 'success');
}

function loadGpsSettings() {
    try {
        const saved = localStorage.getItem('gpsSettings');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading GPS settings:', e);
    }
    return {
        enableRadiusCheck: false,
        latitude: -8.5833,
        longitude: 116.1167,
        maxRadius: 500
    };
}

// Initialize map when GPS radius menu is clicked
document.addEventListener('click', function (e) {
    if (e.target.closest('.menu-item[data-menu="gpsradius"]')) {
        setTimeout(initGpsRadiusMap, 100);
    }
    if (e.target.closest('.menu-item[data-menu="jadwal"]')) {
        setTimeout(() => {
            loadJadwalPreview();
            initJadwalDropzone();
        }, 100);
    }
});

// ===================== Jadwal (Schedule) Management =====================

let jadwalData = null; // Cache for jadwal data

// Initialize dropzone drag & drop
function initJadwalDropzone() {
    const dropzone = document.getElementById('jadwalDropzone');
    if (!dropzone || dropzone.dataset.initialized) return;
    
    dropzone.dataset.initialized = 'true';

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processJadwalFile(files[0]);
        }
    });
}

// Handle file upload from input
function handleJadwalUpload(input) {
    if (input.files && input.files[0]) {
        processJadwalFile(input.files[0]);
    }
}

// Process uploaded file (image or PDF)
async function processJadwalFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
        showAlert('Error', 'Format file tidak didukung! Gunakan JPG, PNG, atau PDF.', 'danger');
        return;
    }

    if (file.size > maxSize) {
        showAlert('Error', 'Ukuran file terlalu besar! Maksimal 5MB.', 'danger');
        return;
    }

    // Show progress
    const progressDiv = document.getElementById('jadwalUploadProgress');
    const progressFill = document.getElementById('jadwalProgressFill');
    const progressStatus = document.getElementById('jadwalUploadStatus');
    
    if (progressDiv) progressDiv.classList.remove('hidden');
    if (progressFill) progressFill.style.width = '10%';
    if (progressStatus) progressStatus.textContent = 'Membaca file...';

    try {
        const reader = new FileReader();
        
        reader.onprogress = (e) => {
            if (e.lengthComputable && progressFill) {
                const percent = Math.round((e.loaded / e.total) * 40) + 10;
                progressFill.style.width = percent + '%';
            }
        };

        reader.onload = async (e) => {
            let base64Data = e.target.result;
            
            if (progressFill) progressFill.style.width = '50%';
            if (progressStatus) progressStatus.textContent = 'Memproses file...';

            // If image, compress it
            if (file.type.startsWith('image/')) {
                try {
                    base64Data = await compressJadwalImage(base64Data, 1200, 0.7);
                } catch (err) {
                    console.error('Compression error:', err);
                    // Use original if compression fails
                }
            }

            if (progressFill) progressFill.style.width = '70%';
            if (progressStatus) progressStatus.textContent = 'Menyimpan ke server...';

            // Save to settings
            const jadwalInfo = {
                type: file.type,
                name: file.name,
                data: base64Data,
                uploadedAt: new Date().toISOString()
            };

            try {
                const result = await apiSaveSettings({
                    jadwalType: jadwalInfo.type,
                    jadwalName: jadwalInfo.name,
                    jadwalData: jadwalInfo.data,
                    jadwalUploadedAt: jadwalInfo.uploadedAt,
                    jadwalUrl: '' // Clear URL when uploading file
                });

                if (progressFill) progressFill.style.width = '100%';
                if (progressStatus) progressStatus.textContent = 'Berhasil!';

                if (result.success) {
                    jadwalData = jadwalInfo;
                    setTimeout(() => {
                        if (progressDiv) progressDiv.classList.add('hidden');
                        loadJadwalPreview();
                        showAlert('Berhasil', 'Jadwal berhasil diupload!', 'success');
                    }, 500);
                } else {
                    if (progressDiv) progressDiv.classList.add('hidden');
                    showAlert('Error', result.message || 'Gagal menyimpan jadwal', 'danger');
                }
            } catch (err) {
                if (progressDiv) progressDiv.classList.add('hidden');
                showAlert('Error', 'Gagal menyimpan ke server: ' + err.message, 'danger');
            }
        };

        reader.onerror = () => {
            if (progressDiv) progressDiv.classList.add('hidden');
            showAlert('Error', 'Gagal membaca file', 'danger');
        };

        reader.readAsDataURL(file);
    } catch (err) {
        if (progressDiv) progressDiv.classList.add('hidden');
        showAlert('Error', 'Terjadi kesalahan: ' + err.message, 'danger');
    }
}

// Compress image for jadwal
function compressJadwalImage(base64, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function () {
            let width = img.width;
            let height = img.height;

            // Scale down if wider than maxWidth
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
        };
        img.onerror = reject;
        img.src = base64;
    });
}

// Save jadwal from URL
async function saveJadwalFromUrl() {
    const urlInput = document.getElementById('jadwalUrlInput');
    const url = urlInput ? urlInput.value.trim() : '';

    if (!url) {
        showAlert('Perhatian', 'Masukkan URL jadwal terlebih dahulu!', 'warning');
        return;
    }

    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showAlert('Error', 'URL harus dimulai dengan http:// atau https://', 'danger');
        return;
    }

    // Convert Google Drive sharing link to direct embed link
    let embedUrl = url;
    if (url.includes('drive.google.com/file/d/')) {
        const fileId = url.match(/\/d\/([^/]+)/);
        if (fileId) {
            embedUrl = `https://drive.google.com/file/d/${fileId[1]}/preview`;
        }
    }

    showAlert('Info', 'Menyimpan URL jadwal...', 'info');

    try {
        const result = await apiSaveSettings({
            jadwalUrl: embedUrl,
            jadwalType: 'url',
            jadwalName: 'Jadwal dari URL',
            jadwalData: '', // Clear file data when using URL
            jadwalUploadedAt: new Date().toISOString()
        });

        if (result.success) {
            jadwalData = {
                type: 'url',
                name: 'Jadwal dari URL',
                data: embedUrl,
                uploadedAt: new Date().toISOString()
            };
            loadJadwalPreview();
            showAlert('Berhasil', 'URL jadwal berhasil disimpan!', 'success');
        } else {
            showAlert('Error', result.message || 'Gagal menyimpan', 'danger');
        }
    } catch (err) {
        showAlert('Error', 'Gagal menyimpan: ' + err.message, 'danger');
    }
}

// Load and display jadwal preview
async function loadJadwalPreview() {
    const previewContainer = document.getElementById('jadwalPreview') || document.getElementById('guruJadwalView');
    const actionsDiv = document.getElementById('jadwalActions');
    
    if (!previewContainer) return;

    previewContainer.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat jadwal...</p></div>';

    try {
        const result = await apiGetSettings();
        if (!result.success) {
            previewContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Gagal memuat jadwal</p></div>';
            return;
        }

        const settings = result.settings;
        const jadwalType = settings.jadwalType || '';
        const jadwalName = settings.jadwalName || '';
        const jadwalFileData = settings.jadwalData || '';
        const jadwalUrl = settings.jadwalUrl || '';
        const jadwalUploadedAt = settings.jadwalUploadedAt || '';

        // Check if URL type
        if (jadwalType === 'url' && jadwalUrl) {
            jadwalData = { type: 'url', name: jadwalName, data: jadwalUrl, uploadedAt: jadwalUploadedAt };
            
            previewContainer.innerHTML = `
                <div class="jadwal-file-info">
                    <i class="fas fa-link"></i>
                    <span>${jadwalName}</span>
                    ${jadwalUploadedAt ? `<small>Diupload: ${formatDateTime(jadwalUploadedAt)}</small>` : ''}
                </div>
                <div class="jadwal-embed-container">
                    <iframe src="${jadwalUrl}" class="jadwal-iframe" allowfullscreen></iframe>
                </div>
                <a href="${jadwalUrl}" target="_blank" class="btn btn-secondary btn-full mt-20">
                    <i class="fas fa-external-link-alt"></i> Buka di Tab Baru
                </a>
            `;
            if (actionsDiv) actionsDiv.classList.remove('hidden');
            return;
        }

        // Check if file data exists
        if (jadwalFileData && jadwalType) {
            jadwalData = { type: jadwalType, name: jadwalName, data: jadwalFileData, uploadedAt: jadwalUploadedAt };

            if (jadwalType === 'application/pdf') {
                previewContainer.innerHTML = `
                    <div class="jadwal-file-info">
                        <i class="fas fa-file-pdf" style="color:#ef4444"></i>
                        <span>${jadwalName}</span>
                        ${jadwalUploadedAt ? `<small>Diupload: ${formatDateTime(jadwalUploadedAt)}</small>` : ''}
                    </div>
                    <div class="jadwal-embed-container">
                        <iframe src="${jadwalFileData}" class="jadwal-iframe"></iframe>
                    </div>
                `;
            } else {
                // Image type
                previewContainer.innerHTML = `
                    <div class="jadwal-file-info">
                        <i class="fas fa-file-image" style="color:#6366f1"></i>
                        <span>${jadwalName}</span>
                        ${jadwalUploadedAt ? `<small>Diupload: ${formatDateTime(jadwalUploadedAt)}</small>` : ''}
                    </div>
                    <div class="jadwal-image-container">
                        <img src="${jadwalFileData}" alt="Jadwal Pelajaran" class="jadwal-image" onclick="openJadwalFullscreen(this.src)">
                        <div class="jadwal-zoom-hint">
                            <i class="fas fa-search-plus"></i> Klik gambar untuk memperbesar
                        </div>
                    </div>
                `;
            }
            if (actionsDiv) actionsDiv.classList.remove('hidden');
            return;
        }

        // No jadwal uploaded
        previewContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Belum ada jadwal yang diupload</p>
                <small style="color:var(--text-secondary)">Upload file jadwal melalui form di atas</small>
            </div>
        `;
        if (actionsDiv) actionsDiv.classList.add('hidden');

    } catch (err) {
        console.error('Error loading jadwal:', err);
        previewContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat jadwal</p>
                <small style="color:var(--danger)">${err.message}</small>
            </div>
        `;
    }
}

// Load jadwal for guru view
async function loadGuruJadwal() {
    const container = document.getElementById('guruJadwalView');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat jadwal...</p></div>';

    try {
        const result = await apiGetSettings();
        if (!result.success) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Gagal memuat jadwal</p></div>';
            return;
        }

        const settings = result.settings;
        const jadwalType = settings.jadwalType || '';
        const jadwalName = settings.jadwalName || '';
        const jadwalFileData = settings.jadwalData || '';
        const jadwalUrl = settings.jadwalUrl || '';

        // URL type
        if (jadwalType === 'url' && jadwalUrl) {
            container.innerHTML = `
                <div class="jadwal-embed-container">
                    <iframe src="${jadwalUrl}" class="jadwal-iframe" allowfullscreen></iframe>
                </div>
                <a href="${jadwalUrl}" target="_blank" class="btn btn-secondary btn-full mt-20">
                    <i class="fas fa-external-link-alt"></i> Buka di Tab Baru
                </a>
            `;
            return;
        }

        // File data
        if (jadwalFileData && jadwalType) {
            if (jadwalType === 'application/pdf') {
                container.innerHTML = `
                    <div class="jadwal-embed-container">
                        <iframe src="${jadwalFileData}" class="jadwal-iframe"></iframe>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="jadwal-image-container">
                        <img src="${jadwalFileData}" alt="Jadwal Pelajaran" class="jadwal-image" onclick="openJadwalFullscreen(this.src)">
                        <div class="jadwal-zoom-hint">
                            <i class="fas fa-search-plus"></i> Klik gambar untuk memperbesar
                        </div>
                    </div>
                `;
            }
            return;
        }

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Belum ada jadwal yang diupload</p>
                <small style="color:var(--text-secondary)">Hubungi admin untuk mengupload jadwal</small>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat jadwal</p>
            </div>
        `;
    }
}

// Open jadwal image in fullscreen modal
function openJadwalFullscreen(src) {
    const modal = document.createElement('div');
    modal.className = 'jadwal-fullscreen-modal';
    modal.innerHTML = `
        <div class="jadwal-fullscreen-overlay" onclick="this.parentElement.remove()">
            <div class="jadwal-fullscreen-controls">
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); this.closest('.jadwal-fullscreen-modal').remove()">
                    <i class="fas fa-times"></i> Tutup
                </button>
            </div>
            <img src="${src}" alt="Jadwal" onclick="event.stopPropagation()">
        </div>
    `;
    document.body.appendChild(modal);
}

// Delete jadwal
async function deleteJadwal() {
    if (!confirm('Yakin ingin menghapus jadwal saat ini?')) return;

    try {
        const result = await apiSaveSettings({
            jadwalType: '',
            jadwalName: '',
            jadwalData: '',
            jadwalUrl: '',
            jadwalUploadedAt: ''
        });

        if (result.success) {
            jadwalData = null;
            loadJadwalPreview();
            showAlert('Berhasil', 'Jadwal berhasil dihapus!', 'success');
        } else {
            showAlert('Error', result.message || 'Gagal menghapus', 'danger');
        }
    } catch (err) {
        showAlert('Error', 'Gagal menghapus: ' + err.message, 'danger');
    }
}

// Download jadwal
function downloadJadwal() {
    if (!jadwalData || !jadwalData.data) {
        showAlert('Error', 'Tidak ada jadwal untuk didownload', 'danger');
        return;
    }

    if (jadwalData.type === 'url') {
        window.open(jadwalData.data, '_blank');
        return;
    }

    const link = document.createElement('a');
    link.href = jadwalData.data;
    link.download = jadwalData.name || 'jadwal';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
