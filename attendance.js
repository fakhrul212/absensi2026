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

    // Get selected jam from checkboxes
    const jamCheckboxes = document.querySelectorAll('input[name="jamMengajar"]:checked');
    if (jamCheckboxes.length === 0) {
        showAlert('Perhatian', 'Silakan pilih minimal satu jam mengajar!', 'warning');
        return;
    }
    const selectedJams = Array.from(jamCheckboxes).map(cb => parseInt(cb.value));

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

    try {
        let successCount = 0;
        let failCount = 0;

        // Submit attendance for each selected jam
        for (const jam of selectedJams) {
            const record = {
                nip: user.nip,
                nama: user.nama,
                mapel: user.mapel || '',
                kelas: kelas,
                jam: jam,
                status: statusRadio.value,
                keterangan: keterangan,
                latitude: location.latitude,
                longitude: location.longitude
            };

            const result = await addAttendanceRecord(record);
            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        if (successCount > 0) {
            // Reset form
            e.target.reset();
            resetScannerState();

            // Show success message
            const successMessage = document.getElementById('successMessage');
            if (successMessage) {
                const jamList = selectedJams.map(j => `Jam ke-${j}`).join(', ');
                successMessage.innerHTML = `
                    Absensi Anda di kelas <strong>${kelas}</strong> pada <strong>${jamList}</strong> 
                    dengan status <strong>${statusRadio.value.toUpperCase()}</strong> telah berhasil dikirim.
                `;
            }
            openModal('successModal');

            // Re-init GPS for next submission
            initGPS();
        } else {
            showAlert('Error', 'Gagal mengirim absensi', 'danger');
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

    container.innerHTML = records.map(r => {
        const status = String(r.status || '').toLowerCase();
        const mapel = r.mapel || '';
        const keterangan = r.keterangan || '';
        return `
        <div class="riwayat-item">
            <div class="riwayat-header">
                <span class="riwayat-date">${formatDateTime(r.timestamp)}</span>
                <span class="riwayat-status ${status}">${status.toUpperCase()}</span>
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
                ${mapel ? `<div class="riwayat-info"><i class="fas fa-book"></i><span>${mapel}</span></div>` : ''}
                ${keterangan ? `<div class="riwayat-ket"><i class="fas fa-sticky-note"></i> ${keterangan}</div>` : ''}
            </div>
        </div>
    `}).join('');
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
