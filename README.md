# 🏍️ Planner Servis Motor (Multi-Motor)

Web app untuk memantau jadwal servis motor — mendukung **lebih dari satu motor** sekaligus, dengan input servis berbasis form dan dashboard riwayat.

## Fitur

- **Multi-motor** — tambah, edit, hapus, dan switch antar beberapa motor lewat dropdown di header. Setiap motor punya odometer, jadwal, riwayat, dan dashboard masing-masing (data terpisah)
- **Input servis (form)** — isi tanggal, KM, biaya, catatan bengkel, lalu **centang semua part** yang dikerjakan dalam satu sesi servis sekaligus
- **Jadwal** — status tiap part (16 part) dengan indikator merah/kuning/hijau berdasarkan KM terakhir servis
- **Riwayat** — daftar semua sesi servis beserta part yang dikerjakan, biaya, dan catatan
- **Dashboard** — ringkasan visual per motor:
  - Total biaya, jumlah sesi servis, jumlah part diservis, rata-rata biaya per sesi
  - Grafik biaya servis per bulan
  - Distribusi biaya per part (pie chart)
  - Frekuensi servis per part
  - Grafik jarak tempuh antar servis
- **Export / Import JSON** — backup data **semua motor sekaligus** dan pindah device

## Interval default

Interval servis bawaan (16 part) di-setup khusus untuk Yamaha XMAX Connected 2026, tapi berlaku sebagai default untuk motor baru manapun yang Anda tambahkan. Anda bisa menambahkan motor lain (motor lama, motor keluarga, dll.) dan tetap pakai jadwal yang sama, atau jadikan acuan umum.

## Cara Deploy ke GitHub Pages

### 1. Buat repository baru di GitHub

- Buka [github.com](https://github.com) → klik **New repository**
- Nama repo: `xmax-planner` (atau bebas)
- Visibility: **Public**
- Jangan centang "Initialize this repository"
- Klik **Create repository**

### 2. Upload file ke GitHub

**Cara A — via web browser (paling mudah):**
1. Di halaman repo yang baru dibuat, klik **uploading an existing file**
2. Drag & drop keempat file: `index.html`, `style.css`, `app.js`, `README.md`
3. Klik **Commit changes**

**Cara B — via Git:**
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/xmax-planner.git
git push -u origin main
```

### 3. Aktifkan GitHub Pages

1. Di repo GitHub, buka **Settings** → **Pages** (menu kiri)
2. Di bagian **Source**, pilih **Deploy from a branch**
3. Branch: **main** / folder: **/ (root)**
4. Klik **Save**

### 4. Buka website

Setelah 1–2 menit, website Anda aktif di:
```
https://USERNAME.github.io/xmax-planner/
```

Ganti `USERNAME` dengan username GitHub Anda.

---

## Struktur File

```
xmax-planner/
├── index.html   # Struktur halaman (4 tab: input, jadwal, riwayat, dashboard)
├── style.css    # Tampilan & tema gelap
├── app.js       # Logika aplikasi, data, dan chart
└── README.md    # Panduan ini
```

## Cara Pakai

1. **Pilih/tambah motor** — gunakan dropdown di header untuk switch motor, atau tombol "Tambah motor" untuk motor baru. Tombol "Edit" untuk ubah nama, tombol tempat sampah untuk hapus motor (minimal harus ada 1 motor)
2. **Tab "Input servis"** — isi tanggal & KM servis, centang semua part yang dikerjakan di sesi itu, lalu simpan
3. **Tab "Jadwal"** — pantau part mana yang sudah waktunya servis (khusus motor yang sedang aktif)
4. **Tab "Riwayat"** — lihat histori lengkap semua sesi servis motor yang aktif
5. **Tab "Dashboard"** — analisis biaya & pola servis motor yang aktif dalam bentuk grafik

## Data & Penyimpanan

Data disimpan di **localStorage** browser (lokal di perangkat), terorganisir per motor. Gunakan fitur **Export** untuk backup seluruh data semua motor ke file `.json`, dan **Import** untuk memuat kembali di perangkat lain. File lama (versi 1 motor) tetap bisa di-import dan otomatis jadi motor baru.

## Interval Servis

| Part | Interval |
|------|----------|
| Oli mesin | 2.500–3.000 km |
| Filter oli | tiap ganti oli ke-2 (5.000–6.000 km) |
| Filter udara | cek 5.000 km, ganti 10.000 km |
| Busi | cek 5.000 km, ganti 10.000–12.000 km |
| Oli gardan/CVT | 5.000 km |
| Filter CVT (bersihkan) | 5.000 km |
| V-belt | cek 5.000 km, ganti 18.000–20.000 km |
| Roller CVT | cek 5.000 km, ganti 15.000–18.000 km |
| Kampas rem (depan & belakang) | cek tiap 5.000 km |
| Minyak rem | ganti 12.000 km atau 1 tahun |
| Aki | cek 5.000 km |
| Rantai keteng | cek tiap 5.000–15.000 km |
| Setelan klep | cek 15.000 km |
| Coolant | ganti 15.000–18.000 km atau 1,5 tahun |
| Tekanan & kondisi ban | cek tiap minggu |
| Suspensi belakang (per ganda) | cek kondisi tiap 10.000 km, evaluasi ganti di 25.000–30.000 km |
