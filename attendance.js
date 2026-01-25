// ===================== Attendance Module (Online Version) =====================

function initAttendance() {
    const form = document.getElementById('absensiForm');
    if (form) {
        form.addEventListener('submit', handleSubmitAbsensi);
    }
}

async function handleSubmitAbsensi(e) {
    e.preventDefault();

    const kelas = getDetectedKelas();
    if (!kelas) {
        showAlert('Perhatian', 'Silakan scan QR Code kelas terlebih dahulu!', 'warning');
        return;
    }

    const jam = document.getElementById('jamMengajar').value;
    if (!jam) {
        showAlert('Perhatian', 'Silakan pilih jam mengajar!', 'warning');
        return;
    }

    const statusRadio = document.querySelector('input[name="status"]:checked');
    if (!statusRadio) {
        showAlert('Perhatian', 'Silakan pilih status kehadiran!', 'warning');
        return;
    }

    const keterangan = document.getElementById('keterangan').value.trim();

    // Validasi lokasi - cek fake GPS
    const locationCheck = validateLocation();
    if (!locationCheck.valid) {
        showAlert('Lokasi Tidak Valid', locationCheck.message, 'danger');
        return;
    }

    const location = getLocation();
    const user = getCurrentUser();

    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    submitBtn.disabled = true;

    const record = {
        nip: user.nip,
        nama: user.nama,
        mapel: user.mapel || '',
        kelas: kelas,
        jam: parseInt(jam),
        status: statusRadio.value,
        keterangan: keterangan,
        latitude: location.latitude,
        longitude: location.longitude
    };

    try {
        const result = await addAttendanceRecord(record);

        if (result.success) {
            // Reset form
            e.target.reset();
            resetScannerState();

            // Show success message
            const successMessage = document.getElementById('successMessage');
            if (successMessage) {
                successMessage.innerHTML = `
                    Absensi Anda di kelas <strong>${kelas}</strong> pada Jam ke-<strong>${jam}</strong> 
                    dengan status <strong>${statusRadio.value.toUpperCase()}</strong> telah berhasil dikirim.
                `;
            }
            openModal('successModal');

            // Re-init GPS for next submission
            initGPS();
        } else {
            showAlert('Error', result.message || 'Gagal mengirim absensi', 'danger');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showAlert('Error', 'Gagal terhubung ke server. Cek koneksi internet.', 'danger');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function loadRiwayatAbsensi() {
    const user = getCurrentUser();
    if (!user) return;

    const container = document.getElementById('riwayatList');
    if (!container) return;

    // Show loading
    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat data...</p></div>';

    try {
        const records = await getAttendance(user.nip, '');
        renderRiwayat(records);
    } catch (error) {
        console.error('Error loading riwayat:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Gagal memuat data</p></div>';
    }
}

function renderRiwayat(records) {
    const container = document.getElementById('riwayatList');
    if (!container) return;

    if (!records || records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Belum ada riwayat absensi</p>
            </div>
        `;
        return;
    }

    container.innerHTML = records.map(r => `
        <div class="riwayat-item">
            <div class="riwayat-header">
                <span class="riwayat-date">${formatDateTime(r.timestamp)}</span>
                <span class="riwayat-status ${r.status}">${r.status.toUpperCase()}</span>
            </div>
            <div class="riwayat-body">
                <div class="riwayat-info">
                    <i class="fas fa-school"></i>
                    <span>${r.kelas}</span>
                </div>
                <div class="riwayat-info">
                    <i class="fas fa-clock"></i>
                    <span>Jam ke-${r.jam}</span>
                </div>
                ${r.mapel ? `<div class="riwayat-info"><i class="fas fa-book"></i><span>${r.mapel}</span></div>` : ''}
                ${r.keterangan ? `<div class="riwayat-ket"><i class="fas fa-sticky-note"></i> ${r.keterangan}</div>` : ''}
            </div>
        </div>
    `).join('');
}

async function filterRiwayat() {
    const user = getCurrentUser();
    if (!user) return;

    const dateFilter = document.getElementById('filterTanggal').value;
    const container = document.getElementById('riwayatList');

    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Memuat...</p></div>';

    try {
        const records = await getAttendance(user.nip, dateFilter);
        renderRiwayat(records);
    } catch (error) {
        console.error('Filter error:', error);
    }
}

function resetFilterRiwayat() {
    document.getElementById('filterTanggal').value = '';
    loadRiwayatAbsensi();
}
