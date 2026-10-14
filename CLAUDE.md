# CLAUDE.md

Dibaca otomatis oleh Claude Code di setiap sesi. Isinya konteks project dan konvensi yang sudah dipakai.
Ikuti pola yang sudah ada, jangan mulai gaya baru. Komunikasi dengan pemilik project dalam bahasa Indonesia.
Jangan memakai tanda em dash (—) di teks, komentar, atau dokumentasi yang Anda tulis.

---

## Tentang project

Sistem HR untuk **Gaharu Sempana Group**: rekrutmen karyawan PKWT dan database karyawan.
Dasar kebutuhan: SOP `007.02/SOP-GSG/V/2026`, dokumen FORM PELAMAR, dan diskusi dengan klien.
PRD lengkap (alur, keputusan terbuka, risiko): https://claude.ai/code/artifact/b118803d-bf8f-4ade-a1db-71cf29fe8ee3

Sistem ini satu dari tiga aplikasi di satu akun Hostinger, masing-masing repo dan subdomain sendiri:
- **Sidamon** (`sistem-informasi-database-monitoring`): data tenaga ahli, sertifikasi, proyek. React JSX + PHP.
- **Simatra** (`finance-sistem`): sistem keuangan. Next.js + PHP. Nanti membaca data karyawan dari HR.
- **HR** (repo ini): `public_html/sistemhr`.

Folder acuan di laptop: `/Users/josetilman/Downloads/GAHARU/`. Boleh dibaca sebagai referensi gaya, jangan diubah dari sini.

## Tech stack dan batasan hosting

Hostinger Premium (shared) TIDAK menjalankan Node.js. Karena itu:
- **Frontend:** React 18 + TypeScript + Vite + Tailwind v3 + react-router v6. Hasil build berupa file statis (`dist/`).
- **Backend:** PHP 8.1+ murni di folder `api/`, tanpa framework dan tanpa Composer (autoload sendiri di `src/bootstrap.php`). Jangan menambah dependensi PHP yang butuh Composer tanpa membahasnya dulu.
- **Database:** MySQL via PDO, database khusus HR (terpisah dari Sidamon dan Simatra).
- **Auth:** JWT HS256 buatan sendiri, token di `sessionStorage`, dikirim sebagai `Authorization: Bearer`.
- Frontend dan API satu domain (`/api/*`), jadi tidak ada CORS. Saat dev, Vite memproksi `/api` ke `php -S localhost:8001`.

## Perintah

```bash
npm install
npm run dev:all        # PHP :8001 + Vite :5174
npm run build          # tsc -b && vite build, wajib lolos sebelum commit
npm run typecheck
php -l <berkas>        # cek sintaks PHP
php api/bin/seed-dev.php                                  # akun contoh, hanya jika APP_ENV = 'local'
php api/bin/create-user.php --email=... --name="..." --role=super_admin   # akun nyata (CLI)
```

Konfigurasi server ada di `api/config/env.php` (gitignored, dibuat manual sekali di server). Template: `env.php.example`.
Skema database: `database/schema.sql`. Setiap perubahan struktur tabel harus ditulis ke berkas itu DAN dicatat sebagai
migrasi terpisah (mis. `database/migrations/2026-10-xx-nama.sql`) supaya bisa dijalankan di database produksi lewat phpMyAdmin.

## Arsitektur backend (clean architecture)

```
api/src/
  Domain/          aturan bisnis murni. DILARANG memakai PDO, $_SERVER, HTTP, atau header
  Application/     use case + antarmuka ke luar (Ports). Mengoordinasikan, tidak berisi aturan bisnis
  Infrastructure/  implementasi: PDO repository, JWT, hasher, Container, Wiring
  Presentation/    Http: Router, Request/Response, Middleware, Controllers, routes.php, Kernel
```

Aturan dependensi: Presentation > Application > Domain. Infrastructure mengimplementasikan antarmuka dari Domain/Application.
Domain tidak boleh `use` kelas dari lapisan lain.

- **Aturan bisnis hidup di aggregate** (contoh `Domain/Recruitment/Mrf.php`): perpindahan status, siapa boleh apa, validasi.
  Controller dan use case tidak boleh mengulang aturan itu. Pertanyaan kewenangan dipakai ulang lewat `canBeViewedBy`,
  `canBeEditedBy`, `canBeDecidedBy`, dan hasilnya dikirim ke frontend sebagai `canEdit`, `canDecide`, `needsMyAction`.
- **Pengecualian domain** (`Domain/Shared`) dipetakan di `Kernel` ke HTTP: `Unauthenticated` 401, `NotAllowed` 403,
  `NotFound` 404, `DomainRuleViolation` 422. Controller cukup melempar, tidak menulis `http_response_code` sendiri.
- Pengguna yang tidak boleh melihat sebuah data diberi **404, bukan 403** (agar keberadaan data tidak bocor).
- **Wiring:** semua objek konkret dirangkai di `Infrastructure/Wiring.php`. Rute didaftarkan di `Presentation/Http/routes.php`.
- Query SQL: selalu prepared statement. Jangan menyusun SQL dari input pengguna.
- Waktu: zona `Asia/Makassar` (WITA). Kolom DATETIME diisi dari PHP, bukan `NOW()`.
- Setiap file PHP: `declare(strict_types=1);`, `final class` kecuali ada alasan.

### Menambah modul baru (urutan kerja)

1. Entitas, enum, aturan, dan antarmuka repository di `Domain/<Modul>/`.
2. Use case di `Application/<Modul>/` dan bentuk keluaran (`*View`) bila perlu.
3. Repository PDO di `Infrastructure/Persistence/`.
4. Controller di `Presentation/Http/Controllers/`.
5. Daftarkan di `Wiring.php` dan `routes.php` (rute privat memakai middleware `Authenticate`).
6. Tabel di `database/schema.sql` + berkas migrasi.
7. Frontend: `src/features/<modul>/...` (lihat di bawah). Tambah menu di `src/auth/permissions.ts`, rute di `src/app/AppRoutes.tsx`.
8. Uji alur lewat curl/browser dengan akun dari `seed-dev.php`. `php -l` semua berkas, `npm run build` harus lolos.

## Konvensi frontend

```
src/
  app/        AppShell, AppRoutes, ProtectedRoute
  auth/       AuthContext, LoginPage, permissions.ts (matriks menu per peran, data murni)
  services/   api.ts (apiFetch, ApiError). Satu-satunya tempat memanggil fetch
  shared/     tipe dan komponen lintas fitur
  features/<modul>/...   types.ts, <modul>Service.ts, halaman, komponen kecil
```

- Semua panggilan API lewat `apiFetch`/`post`/`put` di `services/api.ts`, dibungkus fungsi di `<modul>Service.ts`.
- Tombol aksi ditampilkan berdasarkan flag dari server (`canEdit`, `canDecide`), bukan menebak peran di frontend.
  Server tetap pemegang keputusan. Pengecekan di UI hanya kenyamanan.
- Alias impor `@/` = `src/`. TypeScript `strict`, tanpa `any`.
- Tailwind v3. Kelas bersama (`btn-primary`, `card`, `field-input`, dst.) ada di `src/index.css`. Warna `brand-*`.
- Teks antarmuka seluruhnya Bahasa Indonesia.

## Peran dan aturan bisnis yang sudah dipakai

Empat peran: `super_admin` (CEO), `hr`, `manajer`, `pic`. Divisi bertipe `teknis` (Arsitektur, Sipil, dll.) atau `non_teknis` (Administrasi, Keuangan).

**MRF** (modul pertama, sudah selesai):
- Pembuat: Manajer (semua divisi) atau PIC (hanya divisi teknis).
- PIC: draft > menunggu Manajer divisi > menunggu CEO > disetujui. Manajer: draft > menunggu CEO > disetujui.
- Penolakan = "revisi": kembali ke pembuat dengan catatan WAJIB, diajukan ulang dari awal.
- HR hanya melihat MRF `approved`. Manajer hanya divisinya. PIC hanya miliknya. CEO tidak melihat draft.
- Setiap perubahan status masuk `mrf_approvals` (audit trail, tidak pernah diubah atau dihapus).

## Alur bisnis yang masih harus dibangun (dari SOP dan diskusi klien)

1. HR membuka lowongan dari MRF yang disetujui. Tautan pendaftaran dipasang di poster Instagram `@gaharusempanagroup`.
   Poster dibuat dan disetujui DI LUAR sistem. Buka-tutup lowongan MANUAL oleh HR. Tautan tertutup menampilkan pesan lowongan sudah terisi.
2. Pendaftaran tahap 1: pelamar mengisi email dan mengunggah CV + portofolio. PDF maks. **2 MB**. Foto maks. **500 KB**.
3. HR screening awal: Approve atau Tolak. Tolak = email penolakan otomatis dan data langsung dihapus.
   Approve = email ucapan selamat berisi tautan Form Pelamar digital.
4. Form Pelamar digital mengikuti dokumen FORM PELAMAR. Kolom wajib bertanda bintang, foto opsional,
   tanda tangan digambar di layar atau unggah foto tanda tangan.
5. Manajer dan PIC screening ulang berkas lengkap. CEO, Manajer, HR berdiskusi (termasuk ekspektasi gaji). CEO menyetujui yang dipanggil.
6. Jalur seleksi mengikuti pilihan di MRF: `fast` (langsung wawancara) atau `normal` (uji kompetensi PIC maks. 5 hari kerja, lalu wawancara).
   Wawancara dan tes berjalan di luar sistem. Sistem hanya mencatat tahap dan hasil.
7. Offering Letter: HR menyusun, tanda tangan HR tersemat saat submit. CEO review (bisa komentar revisi) lalu approve, tanda tangan CEO tersemat.
   Dikirim lewat email dengan tombol Setuju, Tolak, Hubungi Admin/HR. Negosiasi di luar sistem.
8. PKWT ditandatangani CEO dan kandidat di kantor, di luar sistem.
9. Karyawan baru mengunggah KTP, NPWP, BPJS, ijazah, foto lewat tautan mandiri di hari pertama. HR memvalidasi.
   Perubahan data privat yang sudah di-submit memicu notifikasi ke CEO dan masuk `audit_logs`.
10. Saat lowongan ditutup: berkas kandidat yang belum terpilih diunduh per tahun/bulan/divisi sebagai talent pool (disimpan 2 tahun),
    lalu dihapus dari server. Bentuk realistis: satu ZIP berisi struktur folder. Hapus dari server hanya setelah HR mengonfirmasi unduhan.
11. **Simatra** membaca karyawan lewat view read-only `v_simatra_employees` (NIK, nama, jabatan, status kepegawaian, gaji),
    hanya yang sudah `validated_at`. Jangan beri Simatra akses tulis. Jika Hostinger tidak bisa membatasi hak per view,
    pakai endpoint API read-only dengan token.

Keputusan yang BELUM dikonfirmasi klien (pakai usulan ini kecuali pemilik project berkata lain; tandai di kode dan PRD):
satu email satu lamaran per lowongan; Form Pelamar kedaluwarsa 3 hari kerja; Offering Letter hangus 5 hari kerja;
kotak persetujuan penyimpanan data 2 tahun; ekspektasi gaji terlihat HR, Manajer pemohon, CEO sedangkan gaji karyawan hanya HR dan CEO;
nama dan nomor HP wajib di pendaftaran tahap 1.

## Keamanan (wajib)

- Berkas unggahan (CV, KTP, NPWP, tanda tangan) disimpan DI LUAR `public_html` (`STORAGE_PATH` di `env.php`) dan diunduh lewat endpoint PHP yang mengecek peran.
  Jangan menyimpan unggahan di `api/uploads` atau folder publik.
- Validasi unggahan di server: tipe MIME asli (bukan hanya ekstensi), ukuran, nama file diacak.
- Jangan pernah mengirim `password_hash` atau token internal ke browser. Pakai `User::toPublicArray()`.
- `api/.htaccess` menolak akses web ke semua berkas di `api/` kecuali `index.php`. Jangan melemahkannya.
- Jangan commit `api/config/env.php`, `.env`, atau data nyata karyawan. Akun contoh hanya untuk `APP_ENV = 'local'`.
- Tautan sekali pakai (Form Pelamar, respons Offering Letter) memakai token acak panjang (`random_bytes`) dan punya masa berlaku.
- Pesan error 500 ke pengguna harus generik. Detail masuk `error_log` saja.

## Deploy

Push ke `main` menjalankan `.github/workflows/deploy.yml`: cek sintaks PHP, `npm ci && npm run build`, lalu rsync lewat SSH
ke `PROJECT_PATH` (= `public_html/sistemhr`). `api/config/env.php` di server tidak ditimpa. Folder `dist/` tidak masuk Git.
Jangan menghapus pengecualian `--exclude` di rsync (melindungi `api/` dan `.htaccess` dari `--delete`).

## Belum ada (jangan berpura-pura ada)

Rate limiting login, reset password, pengelolaan pengguna lewat UI, semua modul di bagian "Alur bisnis yang masih harus dibangun".
