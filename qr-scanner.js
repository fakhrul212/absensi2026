// ===================== QR Scanner Module =====================

let html5QrCode = null;
let scannerRunning = false;
let detectedKelas = null;

function startQRScanner() {
    const qrReader = document.getElementById('qrReader');
    const startBtn = document.getElementById('startScanBtn');

    if (scannerRunning) {
        stopQRScanner();
        return;
    }

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qrReader");
    }

    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memulai Kamera...';
    startBtn.disabled = true;

    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
        },
        onScanSuccess,
        onScanFailure
    ).then(() => {
        scannerRunning = true;
        startBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Scanner';
        startBtn.disabled = false;
        startBtn.classList.remove('btn-primary');
        startBtn.classList.add('btn-danger');
    }).catch((err) => {
        console.error("Error starting scanner:", err);
        startBtn.innerHTML = '<i class="fas fa-camera"></i> Mulai Scan QR';
        startBtn.disabled = false;
        showAlert('Error', 'Gagal mengakses kamera. Pastikan izin kamera diberikan.', 'warning');
    });
}

function stopQRScanner() {
    const startBtn = document.getElementById('startScanBtn');

    if (html5QrCode && scannerRunning) {
        html5QrCode.stop().then(() => {
            scannerRunning = false;
            startBtn.innerHTML = '<i class="fas fa-camera"></i> Mulai Scan QR';
            startBtn.classList.remove('btn-danger');
            startBtn.classList.add('btn-primary');
        }).catch(console.error);
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // Cek apakah hasil scan adalah nama kelas valid
    if (KELAS_LIST.includes(decodedText)) {
        detectedKelas = decodedText;

        // Tampilkan kelas terdeteksi
        const kelasDetected = document.getElementById('kelasDetected');
        const namaKelas = document.getElementById('namaKelas');

        if (kelasDetected) kelasDetected.classList.remove('hidden');
        if (namaKelas) namaKelas.textContent = detectedKelas;

        // Stop scanner setelah sukses
        stopQRScanner();

        // Vibrate jika supported
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        showAlert('Berhasil!', `Kelas ${detectedKelas} terdeteksi.`, 'success');
    } else {
        // QR code tidak valid
        showAlert('Perhatian', 'QR Code tidak dikenali. Pastikan Anda scan QR Code kelas yang valid.', 'warning');
    }
}

function onScanFailure(error) {
    // Ignore scan failures (continuous scanning)
}

function getDetectedKelas() {
    return detectedKelas;
}

function resetScannerState() {
    detectedKelas = null;
    const kelasDetected = document.getElementById('kelasDetected');
    if (kelasDetected) kelasDetected.classList.add('hidden');
}
