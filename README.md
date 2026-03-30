# Jadwal Sholat & Imsakiyah Statis

Aplikasi web statis untuk jadwal sholat lengkap yang berjalan sepenuhnya di *client-side* tanpa backend. Sangat ringan, cepat, dan cocok di-*host* di GitHub Pages.

## Fitur Utama
*   **Waktu Sholat Akurat**: Menggunakan library Adhan.js.
*   **Waktu Terlarang Sholat**: Indikator otomatis waktu syuruq, istiwa (tengah hari), dan sebelum maghrib.
*   **1/3 Malam Terakhir**: Perhitungan otomatis untuk waktu terbaik Tahajud.
*   **Kalender Hijriyah & Ayyamul Bidh**: Widget kalender untuk puasa sunnah.
*   **Mode TV Masjid**: Tampilan layar penuh dan membesar yang mudah dibaca dari jauh.
*   **PWA & Offline**: Mendukung Progressive Web App dan caching offline.
*   **Export PDF**: Simpan jadwal hari ini langsung sebagai file PDF.
*   **Multi Bahasa**: Dukungan Bahasa Indonesia dan Bahasa Inggris.
*   **Tema Gelap/Terang**: Menyesuaikan kenyamanan mata.
*   **Notifikasi Browser**: Alert saat masuk waktu sholat.

## Cara Deploy ke GitHub Pages

1. **Buat Repository Baru**: Buat repo baru di GitHub Anda, misal bernama `jadwal-sholat`.
2. **Upload File**: Upload semua file proyek ini (termasuk folder `assets`, `index.html`, `style.css`, dll) ke repository tersebut.
3. **Aktifkan GitHub Pages**:
   - Buka menu **Settings** di repository Anda.
   - Pilih tab **Pages** di sebelah kiri.
   - Pada bagian **Source**, pilih branch `main` atau `master` dan folder `/ (root)`.
   - Klik **Save**.
4. **Selesai**: GitHub akan memproses deployment. Dalam beberapa menit, aplikasi Anda sudah bisa diakses di `https://<username-github>.github.io/jadwal-sholat/`.

*Catatan Penting*: Jika Anda mendeploy di sub-folder (seperti contoh di atas), jangan lupa untuk memperbarui URL absolut pada tag meta dan `sitemap.xml` di dalam `index.html`.

## Cara Mengganti Metode Hisab

Aplikasi ini secara default menggunakan metode `Singapore` (yang paling mendekati Kemenag RI / MUIS). Jika Anda ingin menggantinya:
1. Buka aplikasi.
2. Klik tombol **Pengaturan** (ikon gear/roda gigi) di pojok kanan atas.
3. Pada dropdown **Metode Perhitungan**, pilih metode yang diinginkan (misal: Muslim World League, Umm Al-Qura, dll).
4. Klik **Simpan**. Preferensi akan tersimpan secara lokal di browser menggunakan IndexedDB.

## Cara Mengubah Kota Default Indonesia

Aplikasi secara default disetel untuk koordinat Jakarta (-6.2088, 106.8456). Untuk mengubah nilai bawaannya:

1. Buka file `assets/js/script.js`.
2. Cari variabel `defaultConfig` di bagian paling atas file:
   ```javascript
   const defaultConfig = {
       lat: -6.2088, // Ganti dengan Latitude kota Anda
       lng: 106.8456, // Ganti dengan Longitude kota Anda
       method: 'Singapore',
       lang: 'id',
       theme: 'dark',
       notifEnabled: false
   };
   ```
3. Simpan perubahan. Setelah itu, pengguna baru yang membuka web akan melihat jadwal untuk kota tersebut (sebelum mereka mengizinkan deteksi lokasi otomatis).

## Performa dan SEO
Aplikasi ini dibangun tanpa framework berat dengan target skor Lighthouse 90+ di semua metrik. Memanfaatkan semantic HTML, JSON-LD, dan file statis yang ringan.
