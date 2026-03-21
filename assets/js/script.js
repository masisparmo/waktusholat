// script.js - Core application logic

// --- Configuration & Constants ---
const defaultConfig = {
    lat: -6.2088, // Default: Jakarta
    lng: 106.8456,
    cityName: 'Kota Jakarta',
    method: 'Singapore', // Default to Kemenag/Singapore
    lang: 'id',
    theme: 'dark',
    notifEnabled: false,
    hijriOffset: 0
};

const texts = {
    id: {
        appTitle: "Jadwal Sholat",
        locationDetecting: "Mendeteksi lokasi...",
        nextPrayerLabel: "Menuju Waktu Berikutnya",
        jadwalTitle: "Sholat Hari Ini",
        printBtnText: "Print",
        prohibitedMsgSafe: "Status: Aman (Bukan waktu terlarang sholat)",
        prohibitedMsgDanger: "Peringatan: Memasuki waktu terlarang sholat.",
        nightThirdTitle: "1/3 Malam Terakhir",
        nightThirdDesc: "Waktu terbaik untuk Tahajud (Dimulai pukul {time})",
        nightThirdActive: "Sekarang adalah waktu 1/3 malam terakhir.",
        nightThirdWait: "Menuju 1/3 malam: {countdown}",
        ayyamulBidhTitle: "Hari Ini Ayyamul Bidh",
        ayyamulBidhDesc: "Disunnahkan berpuasa pada 13, 14, 15 Hijriyah.",
        widgetAyyamulTitle: "Puasa Sunnah Bulan Ini",
        settingsTitle: "Pengaturan",
        labelMethod: "Metode Perhitungan",
        labelHijriOffset: "Koreksi Hijriyah (Hari)",
        labelLocation: "Lokasi (Lat, Lng)",
        btnDetectText: "Deteksi Otomatis",
        labelNotifications: "Notifikasi",
        btnNotifText: "Aktifkan Notifikasi Waktu Sholat",
        btnSaveSettings: "Simpan",
        prayerNames: {
            fajr: "Subuh",
            sunrise: "Syuruq",
            dhuhr: "Dzuhur",
            asr: "Ashar",
            maghrib: "Maghrib",
            isha: "Isya"
        },
        errors: {
            locFailed: "Gagal mendeteksi lokasi.",
            invalidLoc: "Latitude dan Longitude tidak valid"
        },
        months: [
            "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
            "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
            "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah"
        ]
    },
    en: {
        appTitle: "Prayer Times",
        locationDetecting: "Detecting location...",
        nextPrayerLabel: "Next Prayer In",
        jadwalTitle: "Today's Prayers",
        printBtnText: "Print",
        prohibitedMsgSafe: "Status: Safe (Not a prohibited prayer time)",
        prohibitedMsgDanger: "Warning: Entering prohibited prayer time.",
        nightThirdTitle: "Last Third of the Night",
        nightThirdDesc: "Best time for Tahajjud (Starts at {time})",
        nightThirdActive: "It is currently the last third of the night.",
        nightThirdWait: "Starts in: {countdown}",
        ayyamulBidhTitle: "Ayyamul Bidh Today",
        ayyamulBidhDesc: "Sunnah to fast on 13th, 14th, 15th Hijri.",
        widgetAyyamulTitle: "Sunnah Fasting This Month",
        settingsTitle: "Settings",
        labelMethod: "Calculation Method",
        labelHijriOffset: "Hijri Adjustment (Days)",
        labelLocation: "Location (Lat, Lng)",
        btnDetectText: "Auto Detect",
        labelNotifications: "Notifications",
        btnNotifText: "Enable Prayer Notifications",
        btnSaveSettings: "Save",
        prayerNames: {
            fajr: "Fajr",
            sunrise: "Sunrise",
            dhuhr: "Dhuhr",
            asr: "Asr",
            maghrib: "Maghrib",
            isha: "Isha"
        },
        errors: {
            locFailed: "Failed to detect location.",
            invalidLoc: "Invalid Latitude or Longitude"
        },
        months: [
            "Muharram", "Safar", "Rabi Al-Awwal", "Rabi Al-Thani",
            "Jumada Al-Awwal", "Jumada Al-Thani", "Rajab", "Sha'ban",
            "Ramadan", "Shawwal", "Dhu Al-Qi'dah", "Dhu Al-Hijjah"
        ]
    }
};

// Application State
let appState = { ...defaultConfig };
let currentInterval = null;
let currentTimelineInterval = null;
let adhanTimes = null;
let tomorrowAdhanTimes = null;
let currentHijriDate = null; // Object to store current parsed hijri info

// DOM Elements Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize State
    await loadPreferences();

    // 2. Setup Event Listeners
    setupEventListeners();

    // 3. Apply initial theme and language
    applyTheme();
    updateUIText();

    // 4. Main calculation flow
    updateAll();

    // Auto detect location on first load if default
    if (appState.lat === defaultConfig.lat && appState.lng === defaultConfig.lng) {
        attemptAutoLocation();
    }
});

// --- State Management ---
async function loadPreferences() {
    try {
        const storedPrefs = await appDB.getPref();
        if (storedPrefs) {
            appState = { ...defaultConfig, ...storedPrefs };
        }
    } catch (e) {
        console.error("Failed to load preferences:", e);
    }
}

async function savePreferences() {
    try {
        await appDB.savePref(appState);
    } catch (e) {
        console.error("Failed to save preferences:", e);
    }
}

// --- Geolocation ---
function detectLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

async function attemptAutoLocation() {
    try {
        const loc = await detectLocation();
        appState.lat = loc.lat;
        appState.lng = loc.lng;
        await savePreferences();
        updateAll();
    } catch (e) {
        console.warn("Auto location failed, using default.", e);
    }
}

// --- UI / Event Listeners Setup ---
function setupEventListeners() {
    // Monthly Modal
    const monthlyBtn = document.getElementById('monthly-btn');
    const monthlyModal = document.getElementById('monthly-modal');
    const closeMonthly = document.getElementById('close-monthly');

    monthlyBtn.addEventListener('click', () => {
        generateMonthlySchedule();
        monthlyModal.classList.remove('hidden');
    });

    closeMonthly.addEventListener('click', () => {
        monthlyModal.classList.add('hidden');
    });

    // Print Monthly Schedule
    const printMonthlyBtn = document.getElementById('print-monthly-btn');
    printMonthlyBtn.addEventListener('click', () => {
        document.body.classList.add('print-monthly-mode');
        window.print();
        document.body.classList.remove('print-monthly-mode');
    });

    // Export Excel for Monthly Schedule
    const exportExcelBtn = document.getElementById('export-excel-btn');
    exportExcelBtn.addEventListener('click', () => {
        if (typeof XLSX === 'undefined') {
            alert(appState.lang === 'id' ? "Library Excel belum dimuat." : "Excel library not loaded.");
            return;
        }

        const table = document.getElementById('schedule-table-export');
        const wb = XLSX.utils.table_to_book(table, {sheet: "Jadwal Sholat"});

        const titleText = document.getElementById('monthly-title').textContent;
        // Optional: Prepend a row with the title, but standard table export handles the table nicely.
        // We'll just use the title for the filename.
        const filename = `${titleText.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

        XLSX.writeFile(wb, filename);
    });

    // Settings Modal
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const detectLocBtn = document.getElementById('detect-location-btn');
    const citySearch = document.getElementById('city-search');
    const citySuggestions = document.getElementById('city-suggestions');

    settingsBtn.addEventListener('click', () => {
        document.getElementById('calc-method').value = appState.method;
        document.getElementById('hijri-offset').value = appState.hijriOffset || 0;
        document.getElementById('lat-input').value = appState.lat;
        document.getElementById('lng-input').value = appState.lng;
        if (appState.cityName) {
            citySearch.value = appState.cityName;
        } else {
            citySearch.value = '';
        }
        settingsModal.classList.remove('hidden');
    });

    closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // Autocomplete Logic
    let selectedCityName = null;

    citySearch.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        citySuggestions.innerHTML = '';
        if (!val) {
            citySuggestions.classList.add('hidden');
            selectedCityName = null;
            return;
        }

        const matches = indonesiaCities.filter(c => c.name.toLowerCase().includes(val)).slice(0, 10);

        if (matches.length > 0) {
            citySuggestions.classList.remove('hidden');
            matches.forEach(city => {
                const li = document.createElement('li');
                li.textContent = city.name;
                li.addEventListener('click', () => {
                    citySearch.value = city.name;
                    document.getElementById('lat-input').value = city.lat;
                    document.getElementById('lng-input').value = city.lng;
                    selectedCityName = city.name;
                    citySuggestions.classList.add('hidden');
                });
                citySuggestions.appendChild(li);
            });
        } else {
            citySuggestions.classList.add('hidden');
            selectedCityName = null;
        }
    });

    // Close suggestions if clicked outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            citySuggestions.classList.add('hidden');
        }
    });

    // If user modifies lat/lng manually after picking a city, clear city name
    document.getElementById('lat-input').addEventListener('input', () => { selectedCityName = null; citySearch.value = ''; });
    document.getElementById('lng-input').addEventListener('input', () => { selectedCityName = null; citySearch.value = ''; });

    saveSettingsBtn.addEventListener('click', async () => {
        const newLat = parseFloat(document.getElementById('lat-input').value);
        const newLng = parseFloat(document.getElementById('lng-input').value);
        const newMethod = document.getElementById('calc-method').value;
        const newHijriOffset = parseInt(document.getElementById('hijri-offset').value, 10);

        if (!isNaN(newLat) && !isNaN(newLng)) {
            appState.lat = newLat;
            appState.lng = newLng;
            appState.method = newMethod;
            appState.hijriOffset = newHijriOffset;
            appState.cityName = selectedCityName; // Will be null if coordinates typed manually

            await savePreferences();
            settingsModal.classList.add('hidden');
            updateAll();
        } else {
            alert(texts[appState.lang].errors.invalidLoc);
        }
    });

    detectLocBtn.addEventListener('click', async () => {
        try {
            document.getElementById('btn-detect-text').textContent = appState.lang === 'id' ? "Mendeteksi..." : "Detecting...";
            const loc = await detectLocation();
            document.getElementById('lat-input').value = loc.lat;
            document.getElementById('lng-input').value = loc.lng;
            citySearch.value = '';
            selectedCityName = null;
            document.getElementById('btn-detect-text').textContent = appState.lang === 'id' ? "Deteksi Otomatis (GPS)" : "Auto Detect (GPS)";
        } catch (error) {
            document.getElementById('btn-detect-text').textContent = appState.lang === 'id' ? "Deteksi Otomatis (GPS)" : "Auto Detect (GPS)";
            alert(texts[appState.lang].errors.locFailed);
        }
    });

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', async () => {
        appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        await savePreferences();
    });

    // TV Mode Toggle
    const tvModeBtn = document.getElementById('tv-mode-btn');
    tvModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('tv-mode');
        if (document.body.classList.contains('tv-mode')) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    // Print Today's Schedule Toggle
    const printTodayBtn = document.getElementById('print-today-btn');
    printTodayBtn.addEventListener('click', () => {
        document.body.classList.add('print-today-mode');
        window.print();
        document.body.classList.remove('print-today-mode');
    });

    // Language Toggle
    const langToggle = document.getElementById('lang-toggle');
    langToggle.addEventListener('click', async () => {
        appState.lang = appState.lang === 'id' ? 'en' : 'id';
        updateUIText();
        updateAll();
        await savePreferences();
    });

    // Notification Toggle
    const enableNotifBtn = document.getElementById('enable-notif-btn');
    enableNotifBtn.addEventListener('click', async () => {
        if (!("Notification" in window)) {
            alert(appState.lang === 'id' ? "Browser tidak mendukung notifikasi." : "Browser does not support notifications.");
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            appState.notifEnabled = true;
            document.getElementById('notif-status').textContent = "Status: Aktif";
            await savePreferences();
        } else {
            appState.notifEnabled = false;
            document.getElementById('notif-status').textContent = "Status: Ditolak / Denied";
            await savePreferences();
        }
    });

    // Exit TV Mode via ESC key
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            document.body.classList.remove('tv-mode');
        }
    });
}

function applyTheme() {
    const body = document.body;
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    if (appState.theme === 'dark') {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        body.classList.add('light-mode');
        body.classList.remove('dark-mode');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
}

function updateUIText() {
    const t = texts[appState.lang];
    document.getElementById('lang-toggle').textContent = appState.lang === 'id' ? 'EN' : 'ID';

    document.getElementById('app-title').textContent = t.appTitle;
    document.getElementById('next-prayer-label').textContent = t.nextPrayerLabel;
    document.getElementById('jadwal-title').textContent = t.jadwalTitle;
    document.getElementById('print-btn-text').textContent = t.printBtnText;

    // Prohibited message is dynamically updated in checkProhibitedTimes
    document.getElementById('night-third-title').textContent = t.nightThirdTitle;
    document.getElementById('night-third-desc').innerHTML = t.nightThirdDesc.replace('{time}', '<span id="night-third-start">--:--</span>');
    document.getElementById('ayyamul-bidh-title').textContent = t.ayyamulBidhTitle;
    document.getElementById('ayyamul-bidh-desc').textContent = t.ayyamulBidhDesc;

    document.getElementById('widget-ayyamul-title').textContent = t.widgetAyyamulTitle;
    document.getElementById('settings-title').textContent = t.settingsTitle;
    document.getElementById('label-method').textContent = t.labelMethod;
    document.getElementById('label-hijri-offset').textContent = t.labelHijriOffset;
    document.getElementById('label-location').textContent = t.labelLocation;
    document.getElementById('btn-detect-text').textContent = t.btnDetectText;
    document.getElementById('label-notifications').textContent = t.labelNotifications;
    document.getElementById('btn-notif-text').textContent = t.btnNotifText;
    document.getElementById('save-settings-btn').textContent = t.btnSaveSettings;

    // Update prayer names in grid
    document.getElementById('label-fajr').textContent = t.prayerNames.fajr;
    document.getElementById('label-sunrise').textContent = t.prayerNames.sunrise;
    document.getElementById('label-dhuhr').textContent = t.prayerNames.dhuhr;
    document.getElementById('label-asr').textContent = t.prayerNames.asr;
    document.getElementById('label-maghrib').textContent = t.prayerNames.maghrib;
    document.getElementById('label-isha').textContent = t.prayerNames.isha;
}

// --- Monthly Schedule Generation ---

function generateMonthlySchedule() {
    if (typeof adhan === 'undefined') return;

    const container = document.getElementById('monthly-table-container');
    const title = document.getElementById('monthly-title');
    const now = new Date();

    // Set dynamic title
    const monthYearOptions = { month: 'long', year: 'numeric' };
    const locale = appState.lang === 'id' ? 'id-ID' : 'en-US';
    const monthYearStr = now.toLocaleDateString(locale, monthYearOptions);
    const locationStr = appState.cityName ? appState.cityName : `${appState.lat.toFixed(4)}, ${appState.lng.toFixed(4)}`;

    title.textContent = appState.lang === 'id'
        ? `Jadwal Sholat ${monthYearStr} - ${locationStr}`
        : `Prayer Times ${monthYearStr} - ${locationStr}`;

    const coordinates = new adhan.Coordinates(appState.lat, appState.lng);
    let methodParams = adhan.CalculationMethod.Singapore(); // Default
    switch(appState.method) {
        case 'MuslimWorldLeague': methodParams = adhan.CalculationMethod.MuslimWorldLeague(); break;
        case 'Egyptian': methodParams = adhan.CalculationMethod.Egyptian(); break;
        case 'UmmAlQura': methodParams = adhan.CalculationMethod.UmmAlQura(); break;
        case 'Karachi': methodParams = adhan.CalculationMethod.Karachi(); break;
        case 'ISNA': methodParams = adhan.CalculationMethod.NorthAmerica(); break;
        case 'Singapore': methodParams = adhan.CalculationMethod.Singapore(); break;
    }

    let tableHTML = `
        <table class="schedule-table" id="schedule-table-export">
            <thead>
                <tr>
                    <th>${appState.lang === 'id' ? 'Tanggal' : 'Date'}</th>
                    <th>${texts[appState.lang].prayerNames.fajr}</th>
                    <th>${texts[appState.lang].prayerNames.sunrise}</th>
                    <th>${texts[appState.lang].prayerNames.dhuhr}</th>
                    <th>${texts[appState.lang].prayerNames.asr}</th>
                    <th>${texts[appState.lang].prayerNames.maghrib}</th>
                    <th>${texts[appState.lang].prayerNames.isha}</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Generate 30 days starting from today
    for (let i = 0; i < 30; i++) {
        const targetDate = new Date(now.getTime());
        targetDate.setDate(now.getDate() + i);

        const pt = new adhan.PrayerTimes(coordinates, targetDate, methodParams);
        const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
        const dateStr = targetDate.toLocaleDateString(locale, dateOptions);

        const isToday = i === 0;

        tableHTML += `
            <tr class="${isToday ? 'today-row' : ''}">
                <td>${dateStr}</td>
                <td>${formatTime(pt.fajr)}</td>
                <td>${formatTime(pt.sunrise)}</td>
                <td>${formatTime(pt.dhuhr)}</td>
                <td>${formatTime(pt.asr)}</td>
                <td>${formatTime(pt.maghrib)}</td>
                <td>${formatTime(pt.isha)}</td>
            </tr>
        `;
    }

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

// --- Core Calculations ---

function updateAll() {
    // Basic coordinate info
    if (appState.cityName) {
        document.getElementById('location-name').textContent = appState.cityName;
    } else {
        document.getElementById('location-name').textContent = `${appState.lat.toFixed(4)}, ${appState.lng.toFixed(4)}`;
    }

    // Calculate Hijri Date first
    calculateHijriDate();

    // Fetch Adhan info
    calculatePrayerTimes();

    // Date displays
    updateDateDisplays();

    // Calculations relying on time
    checkProhibitedTimes();
    checkNightThird();
    startCountdown();
    updateAyyamulBidhWidget();
}

function calculatePrayerTimes() {
    if (typeof adhan === 'undefined') {
        console.error("Adhan library not loaded.");
        return;
    }

    const date = new Date();
    const coordinates = new adhan.Coordinates(appState.lat, appState.lng);

    let methodParams = adhan.CalculationMethod.Singapore(); // Default
    switch(appState.method) {
        case 'MuslimWorldLeague': methodParams = adhan.CalculationMethod.MuslimWorldLeague(); break;
        case 'Egyptian': methodParams = adhan.CalculationMethod.Egyptian(); break;
        case 'UmmAlQura': methodParams = adhan.CalculationMethod.UmmAlQura(); break;
        case 'Karachi': methodParams = adhan.CalculationMethod.Karachi(); break;
        case 'ISNA': methodParams = adhan.CalculationMethod.NorthAmerica(); break;
        case 'Singapore': methodParams = adhan.CalculationMethod.Singapore(); break;
    }

    // Today
    adhanTimes = new adhan.PrayerTimes(coordinates, date, methodParams);

    // Tomorrow
    const tmrw = new Date(date);
    tmrw.setDate(tmrw.getDate() + 1);
    tomorrowAdhanTimes = new adhan.PrayerTimes(coordinates, tmrw, methodParams);

    // Yesterday
    const ystr = new Date(date);
    ystr.setDate(ystr.getDate() - 1);
    window.yesterdayAdhanTimes = new adhan.PrayerTimes(coordinates, ystr, methodParams);

    renderPrayerTimesGrid();
}

function formatTime(dateObj) {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderPrayerTimesGrid() {
    if (!adhanTimes) return;

    document.getElementById('time-fajr').textContent = formatTime(adhanTimes.fajr);
    document.getElementById('time-sunrise').textContent = formatTime(adhanTimes.sunrise);
    document.getElementById('time-dhuhr').textContent = formatTime(adhanTimes.dhuhr);
    document.getElementById('time-asr').textContent = formatTime(adhanTimes.asr);
    document.getElementById('time-maghrib').textContent = formatTime(adhanTimes.maghrib);
    document.getElementById('time-isha').textContent = formatTime(adhanTimes.isha);
}

// --- Hijri Calendar & Ayyamul Bidh ---

function calculateHijriDate() {
    const now = new Date();
    if (appState.hijriOffset !== 0) {
        now.setDate(now.getDate() + parseInt(appState.hijriOffset, 10));
    }

    // Use Intl.DateTimeFormat to parse out parts of the Hijri date
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    });

    const parts = formatter.formatToParts(now);
    let day = 1;
    let monthIndex = 0;
    let year = 1445;

    for (const part of parts) {
        if (part.type === 'day') day = parseInt(part.value, 10);
        if (part.type === 'month') monthIndex = parseInt(part.value, 10) - 1; // 0-indexed
        if (part.type === 'year') year = parseInt(part.value.replace(/[^0-9]/g, ''), 10);
    }

    currentHijriDate = { day, monthIndex, year };
}

function updateDateDisplays() {
    const now = new Date();

    // Masehi
    const masehiOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const locale = appState.lang === 'id' ? 'id-ID' : 'en-US';
    document.getElementById('masehi-date').textContent = now.toLocaleDateString(locale, masehiOptions);

    // Hijriyah Custom Format
    if (currentHijriDate) {
        const { day, monthIndex, year } = currentHijriDate;
        const monthName = texts[appState.lang].months[monthIndex] || `Month ${monthIndex + 1}`;
        document.getElementById('hijri-date').textContent = `${day} ${monthName} ${year} H`;
    }
}

function updateAyyamulBidhWidget() {
    if (!currentHijriDate) return;

    const { day, monthIndex, year } = currentHijriDate;
    const isAyyamulBidhToday = day >= 13 && day <= 15;

    // Badge visibility
    const badge = document.getElementById('ayyamul-bidh-badge');
    if (isAyyamulBidhToday) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // Populate Widget List for Sunnah Fasts of the month
    const list = document.getElementById('ayyamul-list');
    const dalilContainer = document.getElementById('puasa-sunnah-dalil');
    list.innerHTML = '';
    dalilContainer.innerHTML = '';

    const monthName = texts[appState.lang].months[monthIndex];
    const today = new Date();
    const locale = appState.lang === 'id' ? 'id-ID' : 'en-US';

    let sunnahFasts = [];
    let haditsList = [];

    // 1. Ayyamul Bidh (13, 14, 15) - Berlaku setiap bulan, kecuali Dzulhijjah hari ke-13 (Tasyrik)
    const ayyamulBidhDates = [13, 14, 15];
    ayyamulBidhDates.forEach(d => {
        // Jika bulan Dzulhijjah (index 11) dan tanggal 13, itu hari tasyrik, dilarang puasa.
        if (monthIndex === 11 && d === 13) return;

        sunnahFasts.push({
            hijriDay: d,
            hijriMonth: monthIndex,
            label: 'Ayyamul Bidh'
        });
    });

    haditsList.push(`"Kekasihku (Rasulullah SAW) mewasiatkan kepadaku tiga hal: puasa tiga hari setiap bulan (Ayyamul Bidh), dua rakaat Dhuha, dan shalat Witir sebelum tidur." <strong>(HR. Bukhari & Muslim)</strong>`);

    // 2. Puasa Sunnah Khusus Berdasarkan Bulan
    if (monthIndex === 0) { // Muharram
        sunnahFasts.push({ hijriDay: 9, hijriMonth: 0, label: "Tasu'a" });
        sunnahFasts.push({ hijriDay: 10, hijriMonth: 0, label: "Asyura" });
        haditsList.push(`"Puasa hari Asyura, aku berharap kepada Allah agar ia menghapuskan dosa setahun yang lalu." <strong>(HR. Muslim)</strong>`);
    } else if (monthIndex === 7) { // Sya'ban
        sunnahFasts.push({ hijriDay: 15, hijriMonth: 7, label: "Nisfu Sya'ban" });
    } else if (monthIndex === 8) { // Ramadhan
        // Ramadhan puasa wajib, skip list sunnah bulan ini agar tidak campur
        sunnahFasts = [];
        haditsList = [`Bulan Ramadhan diwajibkan berpuasa sebulan penuh.`];
    } else if (monthIndex === 9) { // Syawal
        // 6 Hari Syawal (mulai tgl 2, karena tgl 1 dilarang)
        for (let i = 2; i <= 7; i++) {
            sunnahFasts.push({ hijriDay: i, hijriMonth: 9, label: `Syawal Hari ke-${i - 1}` });
        }
        haditsList.push(`"Barangsiapa berpuasa Ramadhan kemudian mengikutinya dengan puasa enam hari di bulan Syawal, maka ia seperti puasa setahun penuh." <strong>(HR. Muslim)</strong>`);
    } else if (monthIndex === 11) { // Dzulhijjah
        sunnahFasts.push({ hijriDay: 8, hijriMonth: 11, label: "Tarwiyah" });
        sunnahFasts.push({ hijriDay: 9, hijriMonth: 11, label: "Arafah" });
        haditsList.push(`"Puasa hari Arafah, aku berharap kepada Allah agar ia menghapuskan dosa setahun yang lalu dan setahun yang akan datang." <strong>(HR. Muslim)</strong>`);
    }

    // Sort the dates (just in case)
    sunnahFasts.sort((a, b) => a.hijriDay - b.hijriDay);

    if (sunnahFasts.length === 0) {
        list.innerHTML = `<li><span class="text-muted text-small">Tidak ada puasa sunnah khusus (selain Senin-Kamis) di sisa bulan ini.</span></li>`;
    } else {
        sunnahFasts.forEach(fast => {
            const diffDays = fast.hijriDay - day;
            const targetDate = new Date(today.getTime());
            targetDate.setDate(today.getDate() + diffDays);

            const masehiOptions = { weekday: 'long', day: 'numeric', month: 'short' };
            let gDateStr = targetDate.toLocaleDateString(locale, masehiOptions);

            // Format Hari (Masehi)
            const li = document.createElement('li');
            li.className = 'ayyamul-item';

            let statusClass = '';
            if (diffDays < 0) statusClass = 'text-muted'; // Passed
            else if (diffDays === 0) statusClass = 'text-warning font-bold'; // Today

            li.innerHTML = `
                <div style="display: flex; flex-direction: column;">
                    <span class="hijri-day ${statusClass}">${fast.label} (${fast.hijriDay} ${monthName})</span>
                    <span class="masehi-day ${statusClass} text-small">${gDateStr}</span>
                </div>
            `;
            list.appendChild(li);
        });
    }

    // Set Hadits Dalil
    if (haditsList.length > 0) {
        // Tampilkan semua hadits unik yang berkaitan dengan puasa di bulan tersebut
        dalilContainer.innerHTML = haditsList.map(h => `<p style="margin-bottom: 0.5rem;">${h}</p>`).join('');
    } else {
        dalilContainer.innerHTML = '';
    }
}

// --- Prohibited Times & 1/3 Night ---

function checkProhibitedTimes() {
    if (!adhanTimes) return;
    const now = new Date();
    let isProhibited = false;

    // 1. Syuruq to +15 mins
    const syuruqEnd = new Date(adhanTimes.sunrise);
    syuruqEnd.setMinutes(syuruqEnd.getMinutes() + 15);

    // 2. Zenith (Solar Noon) - approx Dhuhr time, +/- 5 mins
    const zenithStart = new Date(adhanTimes.dhuhr);
    zenithStart.setMinutes(zenithStart.getMinutes() - 5);
    const zenithEnd = new Date(adhanTimes.dhuhr);
    zenithEnd.setMinutes(zenithEnd.getMinutes() + 5);

    // 3. Sunset (Maghrib) - 15 mins before
    const sunsetStart = new Date(adhanTimes.maghrib);
    sunsetStart.setMinutes(sunsetStart.getMinutes() - 15);

    if (now >= adhanTimes.sunrise && now <= syuruqEnd) isProhibited = true;
    if (now >= zenithStart && now <= zenithEnd) isProhibited = true;
    if (now >= sunsetStart && now < adhanTimes.maghrib) isProhibited = true;

    // Update the static prohibited times section
    document.getElementById('prohibited-time-syuruq').innerHTML = `${formatTime(adhanTimes.sunrise)} &mdash; ${formatTime(syuruqEnd)}`;
    document.getElementById('prohibited-time-zawal').innerHTML = `${formatTime(zenithStart)} &mdash; ${formatTime(zenithEnd)}`;
    document.getElementById('prohibited-time-sunset').innerHTML = `${formatTime(sunsetStart)} &mdash; ${formatTime(adhanTimes.maghrib)}`;

    const popupAlert = document.getElementById('prohibited-popup');

    if (isProhibited) {
        popupAlert.classList.remove('hidden');
    } else {
        popupAlert.classList.add('hidden');
    }
}

function checkNightThird() {
    if (!adhanTimes || !tomorrowAdhanTimes || !window.yesterdayAdhanTimes) return;

    const now = new Date();

    // Determine the relevant night period
    let maghribTime, nextFajrTime;

    if (now < adhanTimes.fajr) {
        // We are past midnight but before today's Fajr
        // The "night" started yesterday at Maghrib and ends today at Fajr
        maghribTime = window.yesterdayAdhanTimes.maghrib;
        nextFajrTime = adhanTimes.fajr;
    } else {
        // We are past today's Fajr
        // The "night" starts today at Maghrib and ends tomorrow at Fajr
        maghribTime = adhanTimes.maghrib;
        nextFajrTime = tomorrowAdhanTimes.fajr;
    }

    const totalNightDuration = nextFajrTime.getTime() - maghribTime.getTime();
    const thirdDuration = totalNightDuration / 3;
    const lastThirdStart = new Date(nextFajrTime.getTime() - thirdDuration);

    const badge = document.getElementById('night-third-badge');
    const startTimeElem = document.getElementById('night-third-start');
    const countdownElem = document.getElementById('night-third-countdown');

    if (startTimeElem) startTimeElem.textContent = formatTime(lastThirdStart);

    // Make badge always visible but change content
    badge.classList.remove('hidden');

    if (now >= lastThirdStart && now < nextFajrTime) {
        countdownElem.textContent = texts[appState.lang].nightThirdActive;
        countdownElem.classList.remove('text-muted');
        countdownElem.classList.add('text-emerald');
    } else {
        // Find next 1/3 night start
        let targetStart = lastThirdStart;
        if (now > nextFajrTime) {
            targetStart = new Date(lastThirdStart.getTime() + 24 * 60 * 60 * 1000);
        }

        if (now < targetStart) {
            const diffMs = targetStart - now;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

            const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            countdownElem.textContent = texts[appState.lang].nightThirdWait.replace('{countdown}', timeStr);
            countdownElem.classList.add('text-muted');
            countdownElem.classList.remove('text-emerald');
        }
    }
}

// --- Countdown & Timeline ---

function startCountdown() {
    if (currentInterval) clearInterval(currentInterval);

    const tick = () => {
        if (!adhanTimes) return;

        const now = new Date();
        const prayers = [
            { id: 'fajr', name: 'fajr', time: adhanTimes.fajr },
            { id: 'sunrise', name: 'sunrise', time: adhanTimes.sunrise },
            { id: 'dhuhr', name: 'dhuhr', time: adhanTimes.dhuhr },
            { id: 'asr', name: 'asr', time: adhanTimes.asr },
            { id: 'maghrib', name: 'maghrib', time: adhanTimes.maghrib },
            { id: 'isha', name: 'isha', time: adhanTimes.isha }
        ];

        let nextPrayer = null;
        for (let p of prayers) {
            if (p.time > now) {
                nextPrayer = p;
                break;
            }
        }

        if (!nextPrayer && tomorrowAdhanTimes) {
            nextPrayer = { id: 'fajr', name: 'fajr', time: tomorrowAdhanTimes.fajr };
        }

        if (nextPrayer) {
            const diffMs = nextPrayer.time - now;
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

            document.getElementById('next-prayer-name').textContent = texts[appState.lang].prayerNames[nextPrayer.name];
            document.getElementById('countdown-time').textContent =
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Update Timeline Progress
            updateTimeline(now, prayers, nextPrayer);

            // Trigger Notification exactly when time arrives
            if (hours === 0 && minutes === 0 && seconds === 0 && appState.notifEnabled) {
                sendNotification(texts[appState.lang].prayerNames[nextPrayer.name]);
            }

            // Highlight active card
            document.querySelectorAll('.prayer-card').forEach(c => c.classList.remove('active'));
            const activeCardId = nextPrayer.id === 'sunrise' ? 'card-sunrise' : `card-${nextPrayer.id}`;
            const activeCard = document.getElementById(activeCardId);
            if(activeCard) activeCard.classList.add('active');
        }

        // Check per second to allow real-time countdown for 1/3 night
        checkNightThird();

        if (now.getSeconds() === 0) {
            checkProhibitedTimes();
        }

        // Auto Refresh at Midnight (Check if day changed)
        if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
            console.log("Midnight reached, refreshing data...");
            updateAll();
        }
    };

    tick(); // run immediately
    currentInterval = setInterval(tick, 1000);
}

function updateTimeline(now, prayers, nextPrayer) {
    if (!adhanTimes) return;

    const arcBg = document.getElementById('arc-path-bg');
    const arcProgress = document.getElementById('arc-path-progress');
    const sunIndicator = document.getElementById('sun-indicator-arc');
    const prayerPointsGroup = document.getElementById('prayer-points-group');
    const prohibitedArcsGroup = document.getElementById('prohibited-arcs-group');

    if (!arcBg || !arcProgress || !sunIndicator) return;

    const pathLength = arcBg.getTotalLength();

    // SVG Coordinate Mapping Helpers
    const getPointAtPercent = (percent) => {
        // Clamp between 0 and 1
        percent = Math.max(0, Math.min(1, percent));
        const distance = percent * pathLength;
        return arcBg.getPointAtLength(distance);
    };

    const startTime = adhanTimes.fajr.getTime();
    const endTime = adhanTimes.isha.getTime();
    const totalDuration = endTime - startTime;

    let currentPercent = 0;
    if (now.getTime() < startTime) {
        currentPercent = 0;
    } else if (now.getTime() > endTime) {
        currentPercent = 1;
    } else {
        currentPercent = (now.getTime() - startTime) / totalDuration;
    }

    // 1. Update Progress Line
    arcProgress.style.strokeDasharray = `${currentPercent * pathLength} ${pathLength}`;

    // 2. Position the Sun Indicator
    const sunPoint = getPointAtPercent(currentPercent);
    sunIndicator.classList.remove('hidden');
    // We position it based on percentages within the relative container.
    // The SVG viewport is 0 0 100 50, so x is % directly, y is (y/50)*100 %
    sunIndicator.style.left = `${sunPoint.x}%`;
    sunIndicator.style.top = `${(sunPoint.y / 50) * 100}%`;

    // 3. Draw Points and Prohibited Segments only once
    if (prayerPointsGroup.children.length === 0) {
        prayerPointsGroup.innerHTML = '';
        prohibitedArcsGroup.innerHTML = '';

        // Draw Prohibited Segments First (so they sit below points)
        // 1. Sunrise + 15 mins
        const syuruqEnd = new Date(adhanTimes.sunrise);
        syuruqEnd.setMinutes(syuruqEnd.getMinutes() + 15);
        drawProhibitedArc(adhanTimes.sunrise.getTime(), syuruqEnd.getTime(), startTime, totalDuration, pathLength, prohibitedArcsGroup, arcBg);

        // 2. Zenith -5 to +5 mins
        const zenithStart = new Date(adhanTimes.dhuhr);
        zenithStart.setMinutes(zenithStart.getMinutes() - 5);
        const zenithEnd = new Date(adhanTimes.dhuhr);
        zenithEnd.setMinutes(zenithEnd.getMinutes() + 5);
        drawProhibitedArc(zenithStart.getTime(), zenithEnd.getTime(), startTime, totalDuration, pathLength, prohibitedArcsGroup, arcBg);

        // 3. Maghrib - 15 mins
        const sunsetStart = new Date(adhanTimes.maghrib);
        sunsetStart.setMinutes(sunsetStart.getMinutes() - 15);
        drawProhibitedArc(sunsetStart.getTime(), adhanTimes.maghrib.getTime(), startTime, totalDuration, pathLength, prohibitedArcsGroup, arcBg);


        // Draw Prayer Points
        const timelinePrayers = [
            { id: 'fajr', time: adhanTimes.fajr },
            { id: 'sunrise', time: adhanTimes.sunrise, isProhibited: true },
            { id: 'dhuhr', time: adhanTimes.dhuhr },
            { id: 'asr', time: adhanTimes.asr },
            { id: 'maghrib', time: adhanTimes.maghrib },
            { id: 'isha', time: adhanTimes.isha }
        ];

        const svgNS = "http://www.w3.org/2000/svg";

        timelinePrayers.forEach((p) => {
            const pct = (p.time.getTime() - startTime) / totalDuration;
            const pt = getPointAtPercent(pct);

            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", pt.x);
            circle.setAttribute("cy", pt.y);
            circle.setAttribute("r", "2"); // Radius in SVG coordinate system

            let classes = "prayer-point";
            if (p.isProhibited) classes += " prohibited";
            // Check if past
            if (now.getTime() >= p.time.getTime()) classes += " past";

            circle.setAttribute("class", classes);
            circle.dataset.id = p.id;

            prayerPointsGroup.appendChild(circle);
        });
    } else {
        // Just update past state for existing points
        const points = prayerPointsGroup.querySelectorAll('.prayer-point');
        const timelinePrayers = [
            { id: 'fajr', time: adhanTimes.fajr },
            { id: 'sunrise', time: adhanTimes.sunrise },
            { id: 'dhuhr', time: adhanTimes.dhuhr },
            { id: 'asr', time: adhanTimes.asr },
            { id: 'maghrib', time: adhanTimes.maghrib },
            { id: 'isha', time: adhanTimes.isha }
        ];

        points.forEach(circle => {
            const id = circle.dataset.id;
            const prayer = timelinePrayers.find(p => p.id === id);
            if (prayer && now.getTime() >= prayer.time.getTime()) {
                circle.classList.add('past');
            }
        });
    }
}

function drawProhibitedArc(startMs, endMs, timelineStart, totalDuration, pathLength, group, arcBg) {
    const svgNS = "http://www.w3.org/2000/svg";

    // Clamp to timeline boundaries
    startMs = Math.max(timelineStart, startMs);
    endMs = Math.min(timelineStart + totalDuration, endMs);
    if (startMs >= endMs) return;

    const startPct = (startMs - timelineStart) / totalDuration;
    const endPct = (endMs - timelineStart) / totalDuration;

    // We can simulate an arc segment by creating a path identical to the background arc,
    // but using stroke-dasharray and stroke-dashoffset to only show the relevant segment.
    const segmentLength = (endPct - startPct) * pathLength;
    const offset = -(startPct * pathLength);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M 5,50 A 45,45 0 0,1 95,50");
    path.setAttribute("fill", "none");
    path.setAttribute("class", "arc-prohibited-segment");

    // dasharray: length of segment, length of rest of path
    path.style.strokeDasharray = `${segmentLength} ${pathLength}`;
    path.style.strokeDashoffset = offset;

    group.appendChild(path);
}


function sendNotification(prayerName) {
    if ("Notification" in window && Notification.permission === "granted") {
        const title = appState.lang === 'id' ? `Waktu Sholat ${prayerName}` : `${prayerName} Prayer Time`;
        const options = {
            body: appState.lang === 'id' ? `Telah masuk waktu sholat ${prayerName}.` : `It is now time for ${prayerName} prayer.`,
            icon: 'assets/icons/icon-192x192.png'
        };
        new Notification(title, options);
    }
}
