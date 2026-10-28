# Sistem HR | Gaharu Sempana Group

Sistem HR untuk rekrutmen karyawan PKWT dan database karyawan. Dasar kebutuhan: SOP 007.02/SOP-GSG/V/2026 dan hasil diskusi dengan klien.

**Stack:** React 18 + TypeScript + Vite + Tailwind (frontend statis) · PHP 8.1+ tanpa framework dan tanpa Composer (API) · MySQL.
Hostinger Premium tidak menjalankan Node.js, jadi frontend dibuild menjadi file statis dan backend berupa folder `api/`.

## Status modul

| Modul | Status |
| --- | --- |
| Login, 4 peran (CEO, HR, Manajer, PIC) | Selesai |
| MRF digital (PIC > Manajer > CEO, revisi dengan komentar, riwayat) | Selesai |
| Lowongan, pendaftaran, screening HR | Berikutnya |
| Form Pelamar digital | Berikutnya |
| Offering Letter | Berikutnya |
| Database karyawan, talent pool, view untuk Simatra | Berikutnya (skema sudah ada di `database/schema.sql`) |

## Jalankan di laptop

Butuh Node 20+, PHP 8.1+, MySQL/MariaDB.

DBngin menjalankan server MySQL; TablePlus hanya dipakai untuk melihat dan mengelola isinya. Tidak perlu membuat database atau tabel secara manual untuk instalasi lokal baru.

```bash
npm ci
cp api/config/env.php.example api/config/env.php
mkdir -p storage
```

Isi `api/config/env.php`: `APP_ENV = 'local'`, kredensial `DB_*`, `JWT_SECRET` acak (minimal 32 karakter), dan `STORAGE_PATH` berupa jalur absolut folder `storage` proyek. Buat JWT secret dengan `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`. Untuk DBngin di laptop ini gunakan host `127.0.0.1`, port `3307`, database `sistem_hr`, user `root`, password kosong (sesuaikan jika pengaturan DBngin berbeda). Ekstensi PHP yang dipakai: `pdo_mysql`, `mbstring`, `fileinfo`, dan `zip` untuk arsip unduhan.

```bash
npm run db:migrate -- --create                     # membuat database lokal dan mengimpor skema
php api/bin/seed-dev.php password-dev-123           # 4 akun contoh; hanya untuk APP_ENV = 'local'
npm run dev:all                                    # PHP di :8001 dan Vite di :5174
```

Buka http://localhost:5174. Akun contoh: `admin@gaharusempana.com` (CEO), `hr@gaharusempana.com`, `manajer@gaharusempana.com`, dan `pic@gaharusempana.com` (Sipil), dengan password yang diberikan ke seed. Seed memperbarui password akun contoh yang sudah ada; jalankan hanya saat diperlukan.

Koneksi TablePlus: MySQL, host `127.0.0.1`, port `3307`, user `root`, password kosong, database `sistem_hr`.

### Migrasi database

`npm run db:migrate` menjalankan berkas SQL baru di `database/migrations/` berdasarkan urutan nama, lalu mencatat nama dan checksum di `schema_migrations`. Gunakan nama bertanggal yang meningkat dan jangan mengubah migrasi yang sudah diterapkan.

Instalasi baru mengimpor `database/schema.sql` dan mencatat tujuh migrasi lama sampai `2026-10-17` sebagai baseline karena perubahannya sudah ada di skema. Perintah dapat dijalankan ulang tanpa mengimpor ulang atau menghapus data. `--create` hanya diperbolehkan di lingkungan lokal. Database lama tanpa riwayat migrasi ditolak agar tidak otomatis diubah; periksa dan migrasikan database lama secara terpisah terlebih dahulu.

DDL MySQL tidak otomatis rollback. Jika migrasi gagal sebagian, periksa perubahan yang sudah masuk sebelum mencoba lagi. Untuk produksi, cadangkan database dan jalankan migrasi melalui SSH; workflow deploy belum menjalankannya otomatis.

## Arsitektur backend (`api/src`)

```
Domain/          aturan bisnis murni, tanpa PDO/HTTP. Mrf (aggregate), MrfStatus, MrfSpec, User, Role
Application/     use case (MrfUseCases, Login) dan antarmuka ke luar (Ports)
Infrastructure/  PDO repository, JWT, password hasher, Wiring (container DI)
Presentation/    Router, Request/Response, middleware Authenticate, controller, routes.php
```

Dependensi hanya mengarah ke dalam: Presentation > Application > Domain. Infrastructure mengimplementasikan antarmuka dari Domain/Application.
Modul baru: buat entitas di `Domain/<Modul>`, use case di `Application/<Modul>`, repository di `Infrastructure/Persistence`, controller di `Presentation/Http/Controllers`, lalu daftarkan di `Wiring.php` dan `routes.php`.

## Deploy (Hostinger)

1. Buat subdomain `sistemhr` yang mengarah ke `public_html/sistemhr`, dan database MySQL khusus HR. Impor `database/schema.sql`.
2. Di server buat `api/config/env.php` sekali (salin dari `env.php.example`, `APP_ENV = 'production'`, `JWT_SECRET` acak 64 karakter, `STORAGE_PATH` di luar `public_html`). Deploy tidak menimpanya.
3. Buat akun CEO pertama lewat SSH: `php api/bin/create-user.php --email=... --name="..." --role=super_admin`.
4. Di repo GitHub isi secrets `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `PROJECT_PATH`. Push ke `main` menjalankan `.github/workflows/deploy.yml` (cek PHP, build, rsync).

`api/.htaccess` menolak akses web ke semua berkas di `api/` kecuali `index.php`.

## Aturan MRF yang sudah diimplementasikan

- Pembuat: Manajer (semua divisi) atau PIC (hanya divisi teknis).
- PIC: draft > menunggu Manajer divisi > menunggu CEO > disetujui. Manajer: draft > menunggu CEO > disetujui.
- Manajer atau CEO yang meminta revisi wajib menulis catatan. MRF kembali ke pembuat, diperbaiki, lalu diajukan ulang dari awal.
- HR hanya melihat MRF yang sudah disetujui CEO. Manajer hanya melihat MRF divisinya. PIC hanya melihat miliknya.
- Setiap perubahan status tercatat di `mrf_approvals` (tidak pernah diubah atau dihapus).

Nama status MRF dan aturan di atas adalah usulan yang belum dikonfirmasi klien (lihat PRD, bagian Keputusan terbuka).

## Belum ada (catat sebelum produksi)

- Pembatasan percobaan login (rate limiting).
- Reset password. Sementara akun dibuat dan diganti lewat `bin/create-user.php`.
- Pengelolaan pengguna lewat UI.
