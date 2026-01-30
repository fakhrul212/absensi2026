// ===================== Templates Module =====================
// Dynamic HTML templates for guru and admin pages

function renderGuruPage() {
    const user = getCurrentUser();
    const avatar = user.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=6366f1&color=fff`;

    return `
        <nav class="navbar glass">
            <div class="nav-brand">
                <i class="fas fa-chalkboard-teacher"></i>
                <span>Absensi Guru</span>
            </div>
            <div class="nav-user">
                <img id="guruAvatar" src="${avatar}" alt="Avatar">
                <div class="nav-user-info">
                    <span id="guruName">${user.nama}</span>
                    <small id="guruMapel" class="nav-mapel">${user.mapel || '-'}</small>
                </div>
                <button class="btn-icon" onclick="logout()"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        </nav>
        <main class="main-content">
            <div class="tab-navigation">
                <button class="tab-btn active" data-tab="absensi"><i class="fas fa-qrcode"></i><span>Absensi</span></button>
                <button class="tab-btn" data-tab="riwayat"><i class="fas fa-history"></i><span>Riwayat</span></button>
            </div>
            <div id="tabAbsensi" class="tab-content active">
                <div class="card glass">
                    <div class="card-header"><h2><i class="fas fa-qrcode"></i> Scan QR Code Kelas</h2></div>
                    <div class="card-body">
                        <div id="qrScannerContainer" class="qr-container">
                            <div id="qrReader"></div>
                            <button id="startScanBtn" class="btn btn-primary btn-full" onclick="startQRScanner()">
                                <i class="fas fa-camera"></i> Mulai Scan QR
                            </button>
                        </div>
                        <div id="kelasDetected" class="kelas-info hidden">
                            <div class="info-badge success"><i class="fas fa-check-circle"></i><span>Kelas Terdeteksi:</span></div>
                            <div class="kelas-name" id="namaKelas">-</div>
                        </div>
                    </div>
                </div>
                <div class="card glass">
                    <div class="card-header"><h2><i class="fas fa-map-marker-alt"></i> Lokasi GPS</h2></div>
                    <div class="card-body">
                        <div id="gpsStatus" class="gps-info">
                            <div class="gps-loading"><i class="fas fa-spinner fa-spin"></i><span>Mendeteksi lokasi...</span></div>
                        </div>
                        <div id="gpsCoords" class="gps-coords hidden">
                            <div class="coord-item"><span class="coord-label">Latitude:</span><span id="latitude" class="coord-value">-</span></div>
                            <div class="coord-item"><span class="coord-label">Longitude:</span><span id="longitude" class="coord-value">-</span></div>
                        </div>
                    </div>
                </div>
                <div class="card glass">
                    <div class="card-header"><h2><i class="fas fa-clipboard-list"></i> Form Absensi</h2></div>
                    <div class="card-body">
                        <form id="absensiForm">
                            <div class="form-group">
                                <label><i class="fas fa-clock"></i> Jam Mengajar</label>
                                <div class="jam-checkbox-container" id="jamMengajarCheckbox">
                                    ${JAM_OPTIONS.map(j => `
                                        <label class="jam-checkbox-item">
                                            <input type="checkbox" name="jamMengajar" value="${j.value}">
                                            <span class="jam-checkbox-label">${j.label}</span>
                                        </label>
                                    `).join('')}
                                </div>
                                <div class="jam-select-actions">
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="selectAllJam()"><i class="fas fa-check-double"></i> Pilih Semua</button>
                                    <button type="button" class="btn btn-secondary btn-sm" onclick="deselectAllJam()"><i class="fas fa-times"></i> Hapus Semua</button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-user-check"></i> Status Kehadiran</label>
                                <div class="status-options">
                                    <label class="status-option"><input type="radio" name="status" value="masuk" required><span class="status-btn masuk"><i class="fas fa-sign-in-alt"></i> Masuk</span></label>
                                    <label class="status-option"><input type="radio" name="status" value="keluar"><span class="status-btn keluar"><i class="fas fa-sign-out-alt"></i> Keluar</span></label>
                                    <label class="status-option"><input type="radio" name="status" value="izin"><span class="status-btn izin"><i class="fas fa-file-alt"></i> Izin</span></label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-book"></i> Keterangan / Materi</label>
                                <textarea id="keterangan" rows="3" placeholder="Contoh: Materi BAB 3 - Fisika Dasar"></textarea>
                            </div>
                            <button type="submit" class="btn btn-success btn-full"><i class="fas fa-paper-plane"></i> Kirim Absensi</button>
                        </form>
                    </div>
                </div>
            </div>
            <div id="tabRiwayat" class="tab-content">
                <div class="card glass">
                    <div class="card-header"><h2><i class="fas fa-history"></i> Riwayat Absensi Saya</h2></div>
                    <div class="card-body">
                        <div class="filter-bar">
                            <input type="date" id="filterTanggal" onchange="filterRiwayat()">
                            <button class="btn btn-secondary" onclick="resetFilterRiwayat()"><i class="fas fa-sync"></i> Reset</button>
                        </div>
                        <div id="riwayatList" class="riwayat-list"></div>
                    </div>
                </div>
            </div>
        </main>
    `;
}

function renderAdminPage() {
    const user = getCurrentUser();
    const avatar = user.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=f43f5e&color=fff`;

    return `
        <nav class="navbar glass">
            <div class="nav-brand"><i class="fas fa-user-shield"></i><span>Admin Panel</span></div>
            <div class="nav-user">
                <img id="adminAvatar" src="${avatar}" alt="Avatar">
                <span id="adminName">${user.nama}</span>
                <button class="btn-icon" onclick="logout()"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        </nav>
        <div class="admin-layout">
            <aside class="sidebar glass">
                <ul class="sidebar-menu">
                    <li class="menu-item active" data-menu="dashboard"><i class="fas fa-tachometer-alt"></i><span>Dashboard</span></li>
                    <li class="menu-item" data-menu="monitoring"><i class="fas fa-eye"></i><span>Monitoring Real-Time</span></li>
                    <li class="menu-item" data-menu="users"><i class="fas fa-users"></i><span>Kelola User</span></li>
                    <li class="menu-item" data-menu="search"><i class="fas fa-search"></i><span>Cari Guru</span></li>
                    <li class="menu-item" data-menu="emptyclass"><i class="fas fa-door-open"></i><span>Kelas Kosong</span></li>
                    <li class="menu-item" data-menu="gpsradius"><i class="fas fa-map-marker-alt"></i><span>Radius GPS</span></li>
                    <li class="menu-item" data-menu="reports"><i class="fas fa-print"></i><span>Cetak Laporan</span></li>
                    <li class="menu-item" data-menu="settings"><i class="fas fa-cog"></i><span>Pengaturan</span></li>
                    <li class="menu-item" data-menu="school"><i class="fas fa-school"></i><span>Profil Sekolah</span></li>
                </ul>
            </aside>
            <main class="admin-main">
                ${renderAdminDashboard()}
                ${renderAdminMonitoring()}
                ${renderAdminUsers()}
                ${renderAdminSearch()}
                ${renderAdminEmptyClass()}
                ${renderAdminGpsRadius()}
                ${renderAdminReports()}
                ${renderAdminSettings()}
                ${renderAdminSchool()}
            </main>
        </div>
    `;
}

function renderAdminDashboard() {
    return `
        <div id="menuDashboard" class="menu-content active">
            <h1 class="page-title"><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
            
            <!-- Notifikasi Kelas Kosong Real-time -->
            <div id="emptyClassNotification" class="notification-panel glass hidden">
                <div class="notification-header">
                    <div class="notification-title">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Kelas Kosong Saat Ini</span>
                    </div>
                    <span id="currentJamLabel" class="current-jam-badge"></span>
                </div>
                <div id="emptyClassAlert" class="notification-body"></div>
                <button class="btn btn-secondary btn-sm notification-refresh" onclick="checkEmptyClassesRealtime()">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card glass"><div class="stat-icon bg-primary"><i class="fas fa-users"></i></div><div class="stat-info"><h3 id="totalGuru">0</h3><p>Total Guru</p></div></div>
                <div class="stat-card glass"><div class="stat-icon bg-success"><i class="fas fa-user-check"></i></div><div class="stat-info"><h3 id="totalHadir">0</h3><p>Hadir Hari Ini</p></div></div>
                <div class="stat-card glass"><div class="stat-icon bg-warning"><i class="fas fa-file-alt"></i></div><div class="stat-info"><h3 id="totalIzin">0</h3><p>Izin Hari Ini</p></div></div>
                <div class="stat-card glass"><div class="stat-icon bg-danger"><i class="fas fa-user-times"></i></div><div class="stat-info"><h3 id="totalAbsen">0</h3><p>Belum Absen</p></div></div>
            </div>
            <div class="card glass mt-20">
                <div class="card-header"><h2><i class="fas fa-chart-line"></i> Absensi Terbaru</h2></div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="data-table"><thead><tr><th>Waktu</th><th>Nama Guru</th><th>Mapel</th><th>Kelas</th><th>Jam</th><th>Status</th></tr></thead><tbody id="recentAbsensi"></tbody></table>
                    </div>
                </div>
            </div>
        </div>
    `;
}


function renderAdminMonitoring() {
    return `
        <div id="menuMonitoring" class="menu-content">
            <h1 class="page-title"><i class="fas fa-eye"></i> Monitoring Real-Time</h1>
            <div class="monitoring-filters">
                <select id="monitorJam" onchange="updateMonitoring()">
                    <option value="">Semua Jam</option>
                    ${JAM_OPTIONS.map(j => `<option value="${j.value}">Jam ke-${j.value}</option>`).join('')}
                </select>
                <button class="btn btn-primary" onclick="refreshMonitoring()"><i class="fas fa-sync"></i> Refresh</button>
            </div>
            <div id="monitoringGrid" class="monitoring-grid"></div>
        </div>
    `;
}

function renderAdminUsers() {
    return `
        <div id="menuUsers" class="menu-content">
            <h1 class="page-title"><i class="fas fa-users"></i> Kelola User</h1>
            <div class="action-bar">
                <button class="btn btn-primary" onclick="openModal('addUserModal')"><i class="fas fa-plus"></i> Tambah User</button>
                <button class="btn btn-secondary" onclick="openModal('importUserModal')"><i class="fas fa-file-import"></i> Import User</button>
            </div>
            <div class="card glass mt-20">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="data-table"><thead><tr><th>NIP</th><th>Nama</th><th>Mapel</th><th>Role</th><th>Aksi</th></tr></thead><tbody id="userList"></tbody></table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderAdminSearch() {
    return `
        <div id="menuSearch" class="menu-content">
            <h1 class="page-title"><i class="fas fa-search"></i> Cari Guru</h1>
            <div class="search-box"><input type="text" id="searchGuru" placeholder="Cari berdasarkan NIP atau Nama..." oninput="searchGuruFunc()"><i class="fas fa-search"></i></div>
            <div id="searchResults" class="search-results mt-20"></div>
        </div>
    `;
}

function renderAdminEmptyClass() {
    return `
        <div id="menuEmptyclass" class="menu-content">
            <h1 class="page-title"><i class="fas fa-door-open"></i> Cari Kelas Kosong</h1>
            <div class="card glass">
                <div class="card-body">
                    <div class="filter-grid">
                        <div class="form-group"><label>Tanggal</label><input type="date" id="emptyClassDate"></div>
                        <div class="form-group"><label>Jam</label><select id="emptyClassJam"><option value="">-- Pilih Jam --</option>${JAM_OPTIONS.map(j => `<option value="${j.value}">Jam ke-${j.value}</option>`).join('')}</select></div>
                        <div class="form-group"><button class="btn btn-primary btn-full" onclick="findEmptyClasses()"><i class="fas fa-search"></i> Cari</button></div>
                    </div>
                </div>
            </div>
            <div id="emptyClassResults" class="empty-class-results mt-20"></div>
        </div>
    `;
}

function renderAdminGpsRadius() {
    return `
        <div id="menuGpsradius" class="menu-content">
            <h1 class="page-title"><i class="fas fa-map-marker-alt"></i> Pengaturan Radius GPS</h1>
            <div class="gps-settings-grid">
                <div class="card glass">
                    <div class="card-header"><h2><i class="fas fa-map"></i> Lokasi Sekolah</h2></div>
                    <div class="card-body">
                        <div id="schoolMap" class="school-map"></div>
                        <p class="map-hint"><i class="fas fa-info-circle"></i> Klik pada peta untuk menentukan lokasi sekolah</p>
                    </div>
                </div>
                <div class="card glass">
                    <div class="card-header"><h2><i class="fas fa-sliders-h"></i> Pengaturan</h2></div>
                    <div class="card-body">
                        <div class="form-group">
                            <label><i class="fas fa-toggle-on"></i> Aktifkan Validasi Radius</label>
                            <div class="toggle-switch">
                                <input type="checkbox" id="enableRadiusCheck" onchange="toggleRadiusCheck()">
                                <label for="enableRadiusCheck"></label>
                                <span id="radiusStatus">Nonaktif</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-map-pin"></i> Latitude</label>
                            <input type="number" id="schoolLat" step="any" placeholder="-8.5833">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-map-pin"></i> Longitude</label>
                            <input type="number" id="schoolLng" step="any" placeholder="116.1167">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-circle-notch"></i> Radius (meter)</label>
                            <input type="number" id="schoolRadius" min="50" max="5000" value="500" placeholder="500">
                            <input type="range" id="radiusSlider" min="50" max="2000" value="500" oninput="updateRadiusFromSlider()">
                        </div>
                        <button class="btn btn-primary btn-full" onclick="saveGpsSettings()">
                            <i class="fas fa-save"></i> Simpan Pengaturan GPS
                        </button>
                        <button class="btn btn-secondary btn-full mt-20" onclick="getMyLocation()">
                            <i class="fas fa-crosshairs"></i> Gunakan Lokasi Saya Sekarang
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderAdminReports() {
    return `
        <div id="menuReports" class="menu-content">
            <h1 class="page-title"><i class="fas fa-print"></i> Cetak Laporan</h1>
            <div class="report-cards">
                <div class="card glass"><div class="card-header"><h2><i class="fas fa-calendar-week"></i> Laporan Mingguan</h2></div><div class="card-body"><div class="form-group"><label>Pilih Minggu</label><input type="week" id="reportWeek"></div><button class="btn btn-primary btn-full" onclick="generateWeeklyReport()"><i class="fas fa-download"></i> Cetak Laporan Mingguan</button></div></div>
                <div class="card glass"><div class="card-header"><h2><i class="fas fa-calendar-alt"></i> Laporan Bulanan</h2></div><div class="card-body"><div class="form-group"><label>Pilih Bulan</label><input type="month" id="reportMonth"></div><button class="btn btn-primary btn-full" onclick="generateMonthlyReport()"><i class="fas fa-download"></i> Cetak Laporan Bulanan</button></div></div>
            </div>
        </div>
    `;
}

function renderAdminSettings() {
    const user = getCurrentUser();
    const avatar = user.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=f43f5e&color=fff`;

    return `
        <div id="menuSettings" class="menu-content">
            <h1 class="page-title"><i class="fas fa-cog"></i> Pengaturan Admin</h1>
            <div class="settings-grid">
                <div class="card glass"><div class="card-header"><h2><i class="fas fa-user"></i> Profil Admin</h2></div><div class="card-body"><div class="profile-section"><div class="profile-avatar"><img id="settingsAvatar" src="${avatar}" alt="Avatar"><label class="avatar-edit"><i class="fas fa-camera"></i><input type="file" id="avatarUpload" accept="image/*" onchange="uploadAvatar(this)"></label></div><div class="form-group"><label>Nama Display</label><input type="text" id="adminDisplayName" value="${user.nama}"></div><button class="btn btn-primary" onclick="saveAdminProfile()"><i class="fas fa-save"></i> Simpan Profil</button></div></div></div>
                <div class="card glass"><div class="card-header"><h2><i class="fas fa-key"></i> Ubah Password</h2></div><div class="card-body"><form id="changePasswordForm" onsubmit="changePassword(event)"><div class="form-group"><label>Password Lama</label><input type="password" id="oldPassword" required></div><div class="form-group"><label>Password Baru</label><input type="password" id="newPassword" required></div><div class="form-group"><label>Konfirmasi Password</label><input type="password" id="confirmPassword" required></div><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Ubah Password</button></form></div></div>
                <div class="card glass"><div class="card-header"><h2><i class="fas fa-calendar-check"></i> Tahun Ajaran</h2></div><div class="card-body"><div class="form-group"><label>Tahun Ajaran Aktif</label><input type="text" id="tahunAjaran" placeholder="2025/2026"></div><button class="btn btn-primary" onclick="saveTahunAjaran()"><i class="fas fa-save"></i> Simpan</button></div></div>
            </div>
        </div>
    `;
}

function renderAdminSchool() {
    return `
        <div id="menuSchool" class="menu-content">
            <h1 class="page-title"><i class="fas fa-school"></i> Profil Sekolah</h1>
            <div class="card glass">
                <div class="card-body">
                    <form id="schoolProfileForm" onsubmit="saveSchoolProfileForm(event)">
                        <div class="form-group"><label><i class="fas fa-school"></i> Nama Sekolah</label><input type="text" id="schoolName" placeholder="Nama Sekolah"></div>
                        <div class="form-group"><label><i class="fas fa-user-tie"></i> Nama Kepala Sekolah</label><input type="text" id="principalName" placeholder="Nama Kepala Sekolah"></div>
                        <div class="form-group"><label><i class="fas fa-id-card"></i> NIP Kepala Sekolah</label><input type="text" id="principalNip" placeholder="NIP Kepala Sekolah"></div>
                        <div class="form-group"><label><i class="fas fa-map-marker-alt"></i> Alamat Sekolah</label><textarea id="schoolAddress" rows="3" placeholder="Alamat Lengkap Sekolah"></textarea></div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Simpan Profil Sekolah</button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderModals() {
    document.getElementById('addUserModal').innerHTML = `
        <div class="modal-content glass modal-lg">
            <div class="modal-header"><h2><i class="fas fa-user-plus"></i> Tambah User</h2><button class="close-btn" onclick="closeModal('addUserModal')">&times;</button></div>
            <div class="modal-body">
                <form id="addUserForm" onsubmit="addUser(event)">
                    <div class="form-group"><label>NIP</label><input type="text" id="addNip" required></div>
                    <div class="form-group"><label>Nama Lengkap</label><input type="text" id="addNama" required></div>
                    <div class="form-group"><label>Password</label><input type="password" id="addPassword" required></div>
                    <div class="form-group"><label>Mata Pelajaran</label><input type="text" id="addMapel" placeholder="Contoh: Matematika"></div>
                    <div class="form-group"><label>Role</label><select id="addRole" required><option value="guru">Guru</option><option value="admin">Admin</option></select></div>
                    <div class="form-group">
                        <label><i class="fas fa-school"></i> Kelas Tempat Mengajar</label>
                        <div class="kelas-checkbox-container" id="addKelasCheckbox">
                            ${KELAS_LIST.map((kelas, idx) => `
                                <label class="kelas-checkbox-item">
                                    <input type="checkbox" name="addKelas" value="${kelas}">
                                    <span class="kelas-checkbox-label">${kelas}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="kelas-select-actions">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="selectAllKelas('addKelas')"><i class="fas fa-check-double"></i> Pilih Semua</button>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="deselectAllKelas('addKelas')"><i class="fas fa-times"></i> Hapus Semua</button>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Simpan</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('editUserModal').innerHTML = `
        <div class="modal-content glass modal-lg">
            <div class="modal-header"><h2><i class="fas fa-user-edit"></i> Edit User</h2><button class="close-btn" onclick="closeModal('editUserModal')">&times;</button></div>
            <div class="modal-body">
                <form id="editUserForm" onsubmit="updateUser(event)">
                    <input type="hidden" id="editNipOld">
                    <div class="form-group"><label>NIP</label><input type="text" id="editNip" required></div>
                    <div class="form-group"><label>Nama Lengkap</label><input type="text" id="editNama" required></div>
                    <div class="form-group"><label>Password (kosongkan jika tidak diubah)</label><input type="password" id="editPassword"></div>
                    <div class="form-group"><label>Mata Pelajaran</label><input type="text" id="editMapel" placeholder="Contoh: Matematika"></div>
                    <div class="form-group"><label>Role</label><select id="editRole" required><option value="guru">Guru</option><option value="admin">Admin</option></select></div>
                    <div class="form-group">
                        <label><i class="fas fa-school"></i> Kelas Tempat Mengajar</label>
                        <div class="kelas-checkbox-container" id="editKelasCheckbox">
                            ${KELAS_LIST.map((kelas, idx) => `
                                <label class="kelas-checkbox-item">
                                    <input type="checkbox" name="editKelas" value="${kelas}">
                                    <span class="kelas-checkbox-label">${kelas}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="kelas-select-actions">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="selectAllKelas('editKelas')"><i class="fas fa-check-double"></i> Pilih Semua</button>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="deselectAllKelas('editKelas')"><i class="fas fa-times"></i> Hapus Semua</button>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-save"></i> Update</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('importUserModal').innerHTML = `
        <div class="modal-content glass">
            <div class="modal-header"><h2><i class="fas fa-file-import"></i> Import User</h2><button class="close-btn" onclick="closeModal('importUserModal')">&times;</button></div>
            <div class="modal-body">
                <div class="import-info"><p>Format CSV: NIP, Nama, Password, Role, Mapel</p><p>Contoh: 1234567890, Nama Guru, password123, guru, Matematika</p></div>
                <div class="form-group"><label>Upload File CSV</label><input type="file" id="importFile" accept=".csv" class="file-input"></div>
                <button class="btn btn-primary btn-full" onclick="importUsers()"><i class="fas fa-upload"></i> Import</button>
            </div>
        </div>
    `;
}
