# ZEN STORE

**Premium Colorful E-Commerce Platform** — proyek toko online statis dengan storefront pembeli dan panel admin terpisah, menggunakan HTML5, CSS3, Vanilla JavaScript, SVG, dan LocalStorage.

> **Penting:** proyek ini belum dipublikasikan secara otomatis. URL contoh di bawah hanya format target. GitHub Pages perlu dikonfigurasi pada repository milik pengelola.

## URL target

- Website pembeli: `https://lyuuzhnn.github.io/Zen-Store/`
- Panel admin: `https://lyuuzhnn.github.io/Zen-Store/admin/`

Keduanya adalah halaman berbeda. Storefront bisa dijelajahi tanpa login; admin memiliki halaman autentikasi lokal sendiri. Sidebar desktop berada di kiri dan berubah menjadi drawer dari kiri pada layar kecil.

## Fitur storefront

- Beranda, katalog, kategori, produk terbaru, produk pilihan, wishlist, keranjang, checkout, riwayat pesanan lokal, Tentang, dan pilihan tema.
- Pencarian nama/deskripsi/kategori, filter kategori, rentang harga, stok, diskon, dan pengurutan.
- Wishlist dan keranjang tersimpan di LocalStorage; kuantitas divalidasi terhadap stok yang tersimpan.
- Detail produk memakai data yang dimasukkan admin. Katalog, kategori, wishlist, dan daftar produk awal kosong.
- Checkout memvalidasi data, menyimpan catatan pesanan lokal, lalu membuka WhatsApp untuk ditinjau serta dikirim sendiri oleh pembeli. Nomor WhatsApp harus diisi admin terlebih dahulu.
- Tema terang/gelap dan layout responsif.

## Fitur admin

- Pengaturan akses admin lokal pada pemakaian pertama; sesi bisa diakhiri melalui Logout.
- Dashboard dengan statistik dari data aktual, CRUD produk dan kategori, stok, status draf/publikasi, pilihan produk, dan detail pesanan lokal.
- Pengaturan deskripsi/hero, nomor WhatsApp, teks promosi, informasi pengiriman/pembayaran, serta biaya tambahan tetap bila memang digunakan.
- Ekspor dan impor file JSON dengan pemeriksaan bentuk data dan konfirmasi sebelum mengganti data.

## Produk dan kategori awal

Produk awal benar-benar kosong (`products = []` pada nilai fallback penyimpanan) dan kategori awal juga kosong. Tidak ada produk dummy, harga produk palsu, rating, atau angka penjualan fiktif. Konten katalog hanya muncul setelah pengelola menambahkannya sendiri. Statistik admin dimulai dari nol.

## Struktur direktori

```text
Zen-Store/
├── index.html
├── README.md
├── favicon.svg
├── assets/
│   ├── icons/sprite.svg
│   └── images/
│       ├── zen-mark.svg
│       └── catalog-empty.svg
├── css/
│   ├── style.css
│   ├── components.css
│   ├── responsive.css
│   └── storefront.css
├── js/
│   ├── app.js
│   ├── storage.js
│   ├── products.js
│   ├── cart.js
│   ├── wishlist.js
│   ├── checkout.js
│   └── theme.js
└── admin/
    ├── index.html
    ├── admin.css
    └── admin.js
```

## Menggunakan storefront

1. Buka `index.html` atau website yang sudah diterbitkan.
2. Jelajahi katalog. Jika katalog masih kosong, itu memang keadaan awal yang disengaja.
3. Produk yang dipublikasikan oleh admin dapat dicari, difilter, dibuka detailnya, disimpan ke wishlist, atau dimasukkan ke keranjang.
4. Checkout memerlukan setidaknya satu produk dalam keranjang dan nomor WhatsApp toko yang valid pada pengaturan admin.
5. Saat checkout, pesanan dicatat pada browser pembeli, lalu tautan WhatsApp dibuka. Pembeli tetap harus meninjau dan mengirim pesan sendiri. Website tidak dapat menyatakan WhatsApp terkirim atau toko telah mengonfirmasi pesanan.

## Memulai admin

1. Buka `/admin/`.
2. Pada browser pertama kali, buat username dan kata sandi lokal (minimal 10 karakter). Tidak ada username/password bawaan.
3. Masuk ke dashboard.
4. Buat kategori jika diperlukan, lalu tambah produk. Isi stok, harga, gambar milik toko, dan tentukan apakah produk dipublikasikan.
5. Buka **Pengaturan Toko** dan isi nomor WhatsApp toko sendiri. Jangan gunakan nomor yang bukan milik toko.
6. Ekspor backup JSON secara berkala.

### Batas keamanan admin

GitHub Pages hanya menyajikan file statis. Kredensial admin disimpan di LocalStorage browser dan kata sandinya diproses dengan Web Crypto, tetapi itu **bukan keamanan server**. Kode frontend dapat diperiksa, data LocalStorage bisa diubah/dihapus, dan gerbang login lokal dapat dilewati oleh orang yang memahami browser. Jangan menyimpan data sensitif. Untuk admin yang aman, diperlukan backend atau layanan autentikasi dan database dengan kontrol akses server.

## LocalStorage: batasan penting

Produk, kategori, pengaturan, tema, keranjang, wishlist, dan riwayat pesanan disimpan di LocalStorage pada browser/perangkat yang digunakan. Data **tidak otomatis tersinkron antarperangkat** dan tidak otomatis terkirim ke pemilik toko. Pesanan lokal pada perangkat pembeli tidak otomatis muncul di dashboard admin perangkat lain. Untuk sinkronisasi, stok/pesanan terpusat, dan otorisasi yang nyata, diperlukan backend.

## Ekspor dan impor JSON

- Panel admin → **Ekspor & Impor Data** → **Ekspor JSON** untuk mengunduh file backup.
- Pilih file `.json` yang sebelumnya diekspor, lalu tekan **Validasi & impor**.
- Impor memeriksa versi dan struktur dasar sebelum meminta konfirmasi. Kredensial admin tidak ikut diekspor maupun diganti dari file backup.
- Simpan backup file di lokasi yang aman. Jangan membagikan file backup berisi data pelanggan kepada pihak lain.

## Deploy ke GitHub Pages

### Melalui HP Android dan Termux

1. Pasang dan buka Termux, lalu izinkan akses penyimpanan:

   ```bash
   termux-setup-storage
   pkg update
   pkg install git unzip -y
   ```

2. Letakkan `Zen_Store_GitHub_Pages.zip` di folder **Download/Downloads**. Ekstrak ke folder kerja:

   ```bash
   mkdir -p ~/Zen-Store
   unzip -o ~/storage/downloads/Zen_Store_GitHub_Pages.zip -d ~/Zen-Store
   ```

3. Periksa letak folder dan file:

   ```bash
   cd ~/Zen-Store
   find . -maxdepth 3 -type f | head -50
   ```

   ZIP ini berisi folder `Zen-Store/` di dalamnya. Jadi masuk ke folder yang berisi `index.html`:

   ```bash
   cd ~/Zen-Store/Zen-Store
   ls -la
   ```

4. Inisialisasi Git dan unggah proyek:

   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "Initial ZEN STORE website"
   ```

5. Buat repository GitHub bernama `Zen-Store`. Jika repository tersebut memang milik akun `lyuuzhnn`, hubungkan remote:

   ```bash
   git remote -v
   git remote add origin https://github.com/lyuuzhnn/Zen-Store.git
   git push -u origin main
   ```

   Bila `git remote -v` sudah menampilkan remote yang benar, **jangan** menambahkan remote yang sama lagi. Login GitHub memakai metode autentikasi yang didukung GitHub; jangan menaruh password akun atau token rahasia langsung di source code atau perintah yang bisa tersimpan di riwayat shell.

6. Buka repository di GitHub → **Settings** → **Pages**. Pada sumber publikasi pilih branch `main`, folder `/` (root), lalu simpan. Tunggu status deployment GitHub menunjukkan berhasil, kemudian buka URL yang diberikan GitHub.

   Target URL untuk contoh akun/repository ini:

   - Storefront: `https://lyuuzhnn.github.io/Zen-Store/`
   - Admin: `https://lyuuzhnn.github.io/Zen-Store/admin/`

   URL tersebut belum tentu aktif sebelum repository benar-benar ada, aksesnya sesuai, dan deployment sukses.

### Memperbarui website

Dari folder proyek yang memuat `index.html`, jalankan:

```bash
git add .
git commit -m "Update ZEN STORE"
git push
```


## Pemeriksaan proyek dan status pengujian

Pemeriksaan yang benar-benar dilakukan sebelum paket dibuat:

- Sintaks seluruh modul JavaScript storefront dan admin diperiksa dengan Node.js dan lulus pemeriksaan sintaks.
- Referensi CSS, JavaScript, favicon, SVG logo, dan sprite pada kedua dokumen HTML diperiksa terhadap berkas lokal; semua referensi yang dicek ditemukan.
- Pemindaian source code tidak menemukan identitas toko lama atau daftar produk awal/dummy.
- Uji logika terisolasi berhasil untuk kondisi awal produk/kategori kosong, tambah/hapus produk dan kategori, larangan menghapus kategori yang masih dipakai, validasi stok keranjang, penggunaan harga diskon pada total, wishlist, checkout yang ditolak saat nomor WhatsApp toko belum diatur, pembentukan pesanan lokal setelah nomor diatur, dan validasi struktur JSON.

**Batas pengujian:** pemeriksaan tampilan serta seluruh alur interaksi end-to-end pada browser sungguhan belum dapat diselesaikan di lingkungan pembuat ini karena navigasi browser ke file lokal/localhost diblokir. Lakukan pengujian visual desktop dan HP setelah deployment; jangan menganggap checkout, pengaturan browser, atau izin pop-up sudah diverifikasi pada setiap browser/perangkat. Fitur inti diuji secara logika terisolasi, tetapi ini bukan pengganti uji penerimaan langsung.

## Identitas developer

MUSYAFFA HANIF SUNNI  
JURUSAN TJKT  
SMK NEGERI 1 ADIWERNA

## Catatan versi

- **Versi proyek:** 1.0.0
- **Jenis aplikasi:** static frontend
- **Status deploy:** belum diterbitkan otomatis oleh file ZIP ini
