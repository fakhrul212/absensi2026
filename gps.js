// ===================== GPS Module =====================
// With Fake GPS Detection

let currentLocation = {
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    speed: null,
    error: null,
    isMocked: false,
    warnings: []
};

// Load settings from localStorage or use defaults
function getSchoolConfig() {
    try {
        const saved = localStorage.getItem('gpsSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            return {
                enableRadiusCheck: settings.enableRadiusCheck || false,
                latitude: settings.latitude || -8.5833,
                longitude: settings.longitude || 116.1167,
                maxRadius: settings.maxRadius || 500,
                minAccuracy: 100,
                suspiciousAccuracy: 1
            };
        }
    } catch (e) {
        console.error('Error loading GPS settings:', e);
    }
    return {
        enableRadiusCheck: false,
        latitude: -8.5833,
        longitude: 116.1167,
        maxRadius: 500,
        minAccuracy: 100,
        suspiciousAccuracy: 1
    };
}

// Konfigurasi lokasi sekolah - akan diupdate dari localStorage
let SCHOOL_CONFIG = getSchoolConfig();

function initGPS() {
    const gpsStatus = document.getElementById('gpsStatus');
    const gpsCoords = document.getElementById('gpsCoords');

    if (!navigator.geolocation) {
        showGPSError('Browser tidak mendukung GPS');
        return;
    }

    // Reset warnings
    currentLocation.warnings = [];
    currentLocation.isMocked = false;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Simpan data lokasi lengkap
            currentLocation.latitude = position.coords.latitude;
            currentLocation.longitude = position.coords.longitude;
            currentLocation.accuracy = position.coords.accuracy;
            currentLocation.altitude = position.coords.altitude;
            currentLocation.speed = position.coords.speed;
            currentLocation.error = null;

            // Deteksi fake GPS
            const fakeGPSCheck = detectFakeGPS(position);
            currentLocation.isMocked = fakeGPSCheck.isFake;
            currentLocation.warnings = fakeGPSCheck.warnings;

            if (fakeGPSCheck.isFake) {
                // Pesan sederhana untuk guru tanpa detail teknis
                showGPSError('⚠️ Lokasi tidak valid. Pastikan GPS aktif dan Anda berada di lokasi yang benar.');
                return;
            }

            // Tampilkan warning jika ada tapi tetap izinkan
            if (fakeGPSCheck.warnings.length > 0) {
                console.warn('GPS Warnings:', fakeGPSCheck.warnings);
            }

            if (gpsStatus) gpsStatus.classList.add('hidden');
            if (gpsCoords) {
                gpsCoords.classList.remove('hidden');
                document.getElementById('latitude').textContent = currentLocation.latitude.toFixed(6);
                document.getElementById('longitude').textContent = currentLocation.longitude.toFixed(6);

                // Tampilkan akurasi
                const accuracyInfo = document.getElementById('gpsAccuracy');
                if (accuracyInfo) {
                    accuracyInfo.textContent = `±${Math.round(currentLocation.accuracy)}m`;
                }
            }
        },
        (error) => {
            let message = 'Gagal mendapatkan lokasi';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Akses lokasi ditolak. Silakan izinkan akses lokasi.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Lokasi tidak tersedia';
                    break;
                case error.TIMEOUT:
                    message = 'Timeout mendapatkan lokasi';
                    break;
            }
            showGPSError(message);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0 // Selalu ambil lokasi baru, jangan gunakan cache
        }
    );
}

function detectFakeGPS(position) {
    const result = {
        isFake: false,
        warnings: []
    };

    const coords = position.coords;

    // 1. Cek akurasi yang terlalu sempurna (fake GPS biasanya 0-5 meter)
    if (coords.accuracy !== null && coords.accuracy <= SCHOOL_CONFIG.suspiciousAccuracy) {
        result.warnings.push(`Akurasi terlalu sempurna (${coords.accuracy}m)`);
        result.isFake = true;
    }

    // 2. Cek jika altitude tidak tersedia tapi akurasi sangat tinggi
    // GPS asli biasanya memiliki altitude, fake GPS sering tidak
    if (coords.altitude === null && coords.accuracy < 10) {
        result.warnings.push('Tidak ada data altitude dengan akurasi tinggi');
    }

    // 3. Cek koordinat yang terlalu "bulat" (indikasi manual entry)
    const latDecimals = countDecimals(coords.latitude);
    const lngDecimals = countDecimals(coords.longitude);
    if (latDecimals <= 2 || lngDecimals <= 2) {
        result.warnings.push('Koordinat terlalu bulat');
        result.isFake = true;
    }

    // 4. Cek jika di luar radius sekolah (jika diaktifkan)
    if (SCHOOL_CONFIG.enableRadiusCheck) {
        const distance = calculateDistance(
            coords.latitude,
            coords.longitude,
            SCHOOL_CONFIG.latitude,
            SCHOOL_CONFIG.longitude
        );
        if (distance > SCHOOL_CONFIG.maxRadius) {
            result.warnings.push(`Di luar area sekolah (${Math.round(distance)}m)`);
            result.isFake = true;
        }
    }

    // 5. Cek akurasi terlalu rendah
    if (coords.accuracy > SCHOOL_CONFIG.minAccuracy) {
        result.warnings.push(`Akurasi GPS rendah (${Math.round(coords.accuracy)}m)`);
        // Tidak langsung reject, hanya warning
    }

    // 6. Cek timestamp - fake GPS kadang memiliki timestamp yang tidak wajar
    if (position.timestamp) {
        const posTime = new Date(position.timestamp);
        const now = new Date();
        const timeDiff = Math.abs(now - posTime);
        // Jika timestamp berbeda lebih dari 1 menit, curiga
        if (timeDiff > 60000) {
            result.warnings.push('Timestamp lokasi tidak sinkron');
        }
    }

    return result;
}

// Hitung jarak antara dua koordinat (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius bumi dalam meter
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

function countDecimals(num) {
    if (Math.floor(num) === num) return 0;
    const str = num.toString();
    if (str.indexOf('.') === -1) return 0;
    return str.split('.')[1].length;
}

function showGPSError(message) {
    currentLocation.error = message;
    const gpsStatus = document.getElementById('gpsStatus');
    if (gpsStatus) {
        const isWarning = message.includes('Palsu') || message.includes('⚠️');
        gpsStatus.innerHTML = `
            <div class="gps-loading" style="color: var(--${isWarning ? 'danger' : 'warning'});">
                <i class="fas fa-${isWarning ? 'ban' : 'exclamation-triangle'}"></i>
                <span>${message.replace('\n', '<br>')}</span>
            </div>
            <button class="btn btn-secondary btn-sm mt-20" onclick="initGPS()">
                <i class="fas fa-redo"></i> Coba Lagi
            </button>
        `;
    }
}

function getLocation() {
    return currentLocation;
}

// Fungsi untuk validasi lokasi sebelum submit (dipanggil dari attendance.js)
function validateLocation() {
    if (currentLocation.isMocked) {
        return {
            valid: false,
            message: 'Lokasi palsu terdeteksi! Tidak dapat mengirim absensi.'
        };
    }

    if (currentLocation.error) {
        return {
            valid: false,
            message: 'Lokasi tidak tersedia. Pastikan GPS aktif.'
        };
    }

    if (!currentLocation.latitude || !currentLocation.longitude) {
        return {
            valid: false,
            message: 'Lokasi belum terdeteksi. Tunggu sebentar.'
        };
    }

    return { valid: true };
}
