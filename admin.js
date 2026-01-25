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

    // Auto-refresh empty class notification every 5 minutes
    setInterval(checkEmptyClassesRealtime, 5 * 60 * 1000);

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

    tbody.innerHTML = '<tr><td colspan=\"6\" style=\"text-align:center\"><i class=\"fas fa-spinner fa-spin\"></i> Memuat...</td></tr>';

    try {
        const records = await getAttendance('', '');
        const recent = records.slice(0, 10);

        tbody.innerHTML = recent.map(r => `
            <tr>
                <td>${formatDateTime(r.timestamp)}</td>
                <td>${r.nama}</td>
                <td>${r.mapel || '-'}</td>
                <td>${r.kelas}</td>
                <td>Jam ke-${r.jam}</td>
                <td><span class="riwayat-status ${r.status}">${r.status.toUpperCase()}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center">Belum ada data</td></tr>';
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger)">Gagal memuat data</td></tr>';
    }
}

async function loadUserList() {
    const tbody = document.getElementById('userList');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

    try {
        const users = await getUsers();
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.nip}</td>
                <td>${u.nama}</td>
                <td>${u.mapel || '-'}</td>
                <td><span class="riwayat-status ${u.role === 'admin' ? 'izin' : 'masuk'}">${u.role.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="editUser('${u.nip}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.nip}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
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

    const newUser = {
        nip: document.getElementById('addNip').value.trim(),
        nama: document.getElementById('addNama').value.trim(),
        password: document.getElementById('addPassword').value,
        mapel: document.getElementById('addMapel').value.trim(),
        role: document.getElementById('addRole').value
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
    const user = users.find(u => u.nip === nip);
    if (!user) return;

    document.getElementById('editNipOld').value = user.nip;
    document.getElementById('editNip').value = user.nip;
    document.getElementById('editNama').value = user.nama;
    document.getElementById('editPassword').value = '';
    document.getElementById('editMapel').value = user.mapel || '';
    document.getElementById('editRole').value = user.role;

    openModal('editUserModal');
}

async function updateUser(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    btn.disabled = true;

    const userData = {
        oldNip: document.getElementById('editNipOld').value,
        nip: document.getElementById('editNip').value.trim(),
        nama: document.getElementById('editNama').value.trim(),
        password: document.getElementById('editPassword').value || null,
        mapel: document.getElementById('editMapel').value.trim(),
        role: document.getElementById('editRole').value
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

        container.innerHTML = KELAS_LIST.map(kelas => {
            const kelasRecords = records.filter(r => r.kelas === kelas && (jam === '' || r.jam == jam));
            const isFilled = kelasRecords.length > 0;
            const teacher = isFilled ? kelasRecords[0].nama : '';

            return `
                <div class="class-card glass ${isFilled ? 'filled' : 'empty'}">
                    <div class="class-name">${kelas}</div>
                    <div class="class-status">${isFilled ? 'Terisi' : 'Kosong'}</div>
                    ${teacher ? `<div class="class-teacher">${teacher.split(',')[0]}</div>` : ''}
                </div>
            `;
        }).join('');
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
                    <button class="btn btn-secondary btn-sm" onclick="viewGuruDetail('${u.nip}')">
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
        const guru = users.find(u => u.nip === nip);
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
                    ${records.length > 0 ? records.map(r => `
                        <div class="attendance-item">
                            <span class="riwayat-status ${r.status}">${r.status.toUpperCase()}</span>
                            <span>${r.kelas} - Jam ke-${r.jam}</span>
                            <span class="time">${formatTime(r.timestamp)}</span>
                        </div>
                    `).join('') : '<p class="no-data">Belum ada absensi hari ini</p>'}
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
        { jam: 6, start: 711, end: 710, label: 'Jam ke-6 (11:51 - 11:50)' },   // Corrected based on data.js
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

    // If outside teaching hours, hide notification
    if (!currentJamInfo) {
        notificationPanel.classList.add('hidden');
        return;
    }

    try {
        const today = getTodayDate();
        const records = await getAttendance('', today);
        const filtered = records.filter(r => r.jam == currentJamInfo.jam);
        const filledClasses = new Set(filtered.map(r => r.kelas));

        // Only check actual classroom (exclude special rooms for now, or include all)
        const emptyClasses = KELAS_LIST.filter(k => !filledClasses.has(k));

        // Update UI
        jamLabel.textContent = currentJamInfo.label;

        if (emptyClasses.length > 0) {
            notificationPanel.classList.remove('hidden');
            alertContainer.innerHTML = `
                <div class="empty-class-count">
                    <span class="count-number">${emptyClasses.length}</span>
                    <span class="count-label">Kelas Kosong</span>
                </div>
                <div class="empty-class-tags">
                    ${emptyClasses.slice(0, 10).map(k => `<span class="empty-tag">${k}</span>`).join('')}
                    ${emptyClasses.length > 10 ? `<span class="empty-tag more">+${emptyClasses.length - 10} lainnya</span>` : ''}
                </div>
            `;
        } else {
            // Show success message when all classes are filled
            notificationPanel.classList.remove('hidden');
            alertContainer.innerHTML = `
                <div class="all-filled-message">
                    <i class="fas fa-check-circle"></i>
                    <span>Semua kelas sudah terisi pada ${currentJamInfo.label}!</span>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error checking empty classes:', e);
        notificationPanel.classList.add('hidden');
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
    const filtered = records.filter(r => r.timestamp && r.timestamp.includes(period.replace('W', '-')));

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
                        <td>${r.status.toUpperCase()}</td>
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
        const reader = new FileReader();
        reader.onload = async function (e) {
            const user = getCurrentUser();
            const result = await updateUserInSheet({
                oldNip: user.nip,
                nip: user.nip,
                nama: user.nama,
                role: user.role,
                foto: e.target.result
            });

            if (result.success) {
                user.foto = e.target.result;
                localStorage.setItem('currentUser', JSON.stringify(user));
                document.getElementById('settingsAvatar').src = e.target.result;
                document.getElementById('adminAvatar').src = e.target.result;
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
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
    const users = await getUsers();
    const found = users.find(u => u.nip === user.nip);

    if (!found || found.password !== oldPass) {
        showAlert('Error', 'Password lama salah!', 'danger');
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

function saveGpsSettings() {
    const settings = {
        enableRadiusCheck: document.getElementById('enableRadiusCheck').checked,
        latitude: parseFloat(document.getElementById('schoolLat').value) || 0,
        longitude: parseFloat(document.getElementById('schoolLng').value) || 0,
        maxRadius: parseInt(document.getElementById('schoolRadius').value) || 500
    };

    // Save to localStorage
    localStorage.setItem('gpsSettings', JSON.stringify(settings));

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
});
