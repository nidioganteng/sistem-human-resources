# Implementasi spesifikasi HR v2

Acuan: `spesifikasi_sistem_hr-v2.pdf` (empat halaman). Perubahan berada di branch `feat/hr-spec-v2`. Dokumen ini membedakan fitur aplikasi yang sudah dibuat dari koneksi eksternal dan kebijakan yang masih harus dikonfirmasi.

## Cakupan aplikasi

| Kebutuhan | Implementasi |
| --- | --- |
| MRF PIC → Manajer → CEO → HR | Persetujuan, revisi dengan catatan, notifikasi dalam aplikasi dan antrean email |
| Lowongan publik dan QR | Tautan publik serta unduh QR PNG |
| CV, portofolio, sertifikat | PDF maksimal 2 MB per berkas; CV wajib |
| Screening dan undangan | Persetujuan/penolakan tersimpan bersama antrean email; riwayat penolakan ikut arsip |
| Form pelamar | Foto maksimal 500 KB, tanda tangan canvas/unggah, unduh PDF berkop perusahaan |
| Review bersama | HR/CEO melihat kandidat; Manajer/PIC dibatasi divisi; Manajer dapat shortlist |
| Jalur seleksi | Fast langsung interview; normal harus lulus kompetensi; PIC/Manajer mencatat teknis, HR/CEO interview |
| Offering Letter | Tanda tangan profil HR dan CEO, snapshot tanda tangan, PDF resmi, tautan terima/tolak/hubungi HR dengan konfirmasi |
| Transisi onboarding | Setelah OL diterima, pendaftaran ditutup. HR memilih Mulai Onboarding; kontak, biodata dari form, gaji dan tanggal mulai OL diteruskan ke master karyawan berstatus onboarding |
| Onboarding | Tautan dibuat HR dan email diantrekan; biodata sudah terisi dari kandidat. NIK 16 digit, data pribadi, enam dokumen: KTP, KK, NPWP, BPJS, ijazah, foto; validasi HR sebelum aktif |
| Master karyawan | PKWT, PKWTT, freelance; data payroll, catatan penahanan pembayaran |
| Perubahan sensitif | Edit HR atas data tervalidasi menjadi permintaan; CEO menyetujui/menolak; perubahan bersamaan dideteksi |
| Enkripsi | AES-256-GCM untuk data pribadi master karyawan, payload workflow dan audit; dokumen karyawan, SP dan ZIP arsip terenkripsi di penyimpanan |
| Disiplin | Teguran lisan/tertulis, SP1/SP2/SP3; lampiran PDF wajib untuk SP |
| Karier | Riwayat promosi/demosi/SK; jabatan aktif diubah melalui profil dan persetujuan CEO |
| Offboarding | Pemberitahuan minimal satu bulan kalender, hari terakhir, ceklis serah terima; selesai menonaktifkan karyawan, token onboarding dan status barcode di HR |
| Talent pool | Snapshot kandidat dan berkas tersimpan dua tahun; CV/portofolio/sertifikat dapat diunduh setelah data kandidat aktif dibersihkan |
| Arsip lowongan | Penutupan manual/permintaan arsip menyiapkan ZIP lengkap (CSV, manifest, formulir, penawaran, berkas); frontend memeriksa SHA-256 sebelum meminta pembersihan. Penerimaan OL hanya menutup pendaftaran, tidak menghapus data |
| Perlindungan arsip | Server memeriksa checksum dan perubahan data; MRF, approval history, master karyawan, talent pool, dan salinan arsip server dipertahankan |
| API payroll | Endpoint baca dengan token terpisah, paginasi dan filter waktu; termasuk status nonaktif untuk sinkronisasi |

## Menjalankan perubahan

1. Cadangkan database dan seluruh folder storage beserta konfigurasi kunci. Konfigurasi lokal dan backup tidak masuk Git.
2. Jalankan `npm ci` dan `composer install --working-dir=api`.
3. Isi `DATA_ENCRYPTION_KEY` di `api/config/env.php` dengan 64 karakter hex acak. Buat sekali memakai `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`. Kunci ini berbeda dari JWT dan harus disimpan bersama backup secara aman. Mengganti kunci tanpa konversi ulang membuat data lama tidak terbaca.
4. Jalankan `npm run db:migrate`. Untuk database baru gunakan `npm run db:migrate -- --create`. Migrasi v2 menambah tabel workflow, kolom enkripsi, dokumen KK, snapshot tanda tangan dan relasi karyawan yang tetap aman ketika data pelamar dibersihkan.
5. Periksa `php api/bin/encrypt-existing.php`. Setelah backup dan hasil dry run diperiksa, jalankan `php api/bin/encrypt-existing.php --apply` bila masih ada data lama. Perintah dapat dijalankan ulang.
6. Jalankan `npm run dev:all`. Pada terminal terpisah jalankan `npm run worker` untuk email dan retensi. Mode lokal menulis email ke terminal worker, sehingga tidak mengirim email sungguhan.
7. HR dan CEO mengunggah tanda tangan di menu Tanda Tangan Profil sebelum membuat/menyetujui OL.

Ekstensi PHP: `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`, `gd`, `iconv`, `zip`. FPDF dipasang lewat Composer. Worker satu putaran: `php api/bin/work.php`; worker berulang: `php api/bin/work.php --watch`. Retensi terpisah: `php api/bin/retention.php` (dry run), lalu `--apply` untuk menjalankan.

Di produksi, jalankan worker berulang melalui pengelola proses/layanan yang tersedia di hosting. Polling lima detik mendukung target antrean 15–30 detik, tetapi penerimaan email tetap bergantung pada provider. Cron sekali per menit tidak memenuhi target tersebut. Fungsi `mail()` membutuhkan transport email yang benar pada hosting; header `MAIL_FROM` saja belum mengonfigurasi transport. Pengiriman bersifat setidaknya sekali: pemulihan worker setelah gangguan bisa menyebabkan email ulang.

Deploy memasang dependensi Composer, tetapi tidak menjalankan migrasi atau mengatur kunci/worker otomatis. Siapkan kunci server, backup, migrasi dan konversi data dalam jendela pemeliharaan sebelum kode baru digunakan. View SQL lama `v_simatra_employees` tidak lagi membuka data pribadi; konsumen lama harus berpindah ke API.

## Integrasi eksternal yang perlu disambungkan

`GET /api/integrations/payroll/employees?page=1&limit=50&since=2026-10-29T00:00:00%2B08:00`

Header: `Authorization: Bearer <PAYROLL_API_TOKEN>`. Buat token acak terpisah minimal 32 karakter dan isi di konfigurasi server serta konsumen. Endpoint sengaja mengembalikan 503 selama token belum dikonfigurasi; JWT login bukan token integrasi. Respons berisi `items`, `page`, `limit`, `total`, `hasMore`; setiap item memuat identitas, NIK, NPWP, PTKP, bank, BPJS, gaji, status kerja, catatan pembayaran, status barcode, dan waktu pembaruan. Hanya karyawan tervalidasi yang diekspor, termasuk yang sudah nonaktif. Konsumen harus melakukan upsert berdasarkan ID dan menangani status nonaktif. Gunakan HTTPS untuk server produksi.

Koneksi nyata SIMANTRA/keuangan/Sidamon belum dikonfigurasi dan belum diuji dengan sistem tujuan. Data tarif, SPMK, penugasan proyek dan termin dari sistem eksternal belum diimpor karena kontrak API, URL, autentikasi dan sumber datanya belum tersedia. Status barcode dinonaktifkan di HR dan diekspos API; penerapannya di Sidamon bergantung pada konsumen sinkronisasi.

## Kebijakan yang belum dipastikan

- PDF menyebut PKWT dengan probation. Aplikasi menyimpan jenis hubungan kerja, belum mengotomatiskan aturan probation; kebijakan dan kolom yang dibutuhkan harus dikonfirmasi HR.
- Tautan form pelamar saat ini 72 jam; respons OL tujuh hari kalender. Belum ada kalender hari kerja/libur untuk menghitung lima hari kerja.
- Kop PDF memakai identitas perusahaan yang tersedia di proyek; alamat, nomor surat, dan format resmi final perlu dibandingkan dengan template perusahaan.
- Arsip server disimpan untuk pemulihan setelah pembersihan aktif. Talent pool dibersihkan setelah dua tahun; masa retensi arsip perusahaan perlu ditetapkan terpisah.

## Verifikasi

`npm run build` memeriksa TypeScript dan build frontend. `npm run test:backend` menjalankan tes domain/enkripsi/PDF. `php tests/backend.php --mysql` membuat database uji acak terpisah, menguji migrasi dan alur end-to-end backend, lalu menghapus database uji; tidak memakai database HR utama. Parameter koneksi opsional: `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`.

Login dan otorisasi HTTP keempat role sudah diperiksa pada backend lokal. PDF formulir dan OL contoh telah dirender dan diperiksa. Tampilan interaktif di browser dan pengiriman email produksi belum diuji.

## Alur onboarding yang diperbarui

1. HR mengirim OL yang sudah disetujui CEO. Beberapa kandidat boleh menerima penawaran untuk lowongan yang sama.
2. Hubungi HR/negosiasi tidak menyatakan penerimaan. Kandidat harus mengonfirmasi Terima; setelah itu lowongan berhenti menerima pendaftaran baru, HR/CEO menerima notifikasi. Penawaran kandidat lain tetap tersimpan dan dapat direspons.
3. HR membuka kandidat di detail lowongan lalu memilih **Mulai Onboarding**. Ini menggantikan label **Jadikan Karyawan**. Hanya kandidat yang menerima OL dapat dipindahkan. Sistem membuat satu master karyawan berstatus onboarding dan meneruskan email, HP, biodata yang tersedia, jenis kerja dari MRF, gaji dan tanggal mulai dari OL.
4. Pada detail karyawan, HR memilih **Buat Link Onboarding**. Tautan berlaku tujuh hari, ditampilkan untuk disalin, dan dikirim melalui antrean email bila email karyawan tersedia. Pembuatan ulang membatalkan tautan sebelumnya. Pada mode lokal tautan email muncul di terminal worker.
5. Karyawan membuka tautan, memeriksa biodata yang sudah terisi, lalu melengkapi data dan dokumen. Data yang belum tersedia tetap harus dilengkapi; unggah KTP, KK, NPWP, BPJS, ijazah dan foto. Form pelamar lengkap dan onboarding adalah dua tahap berbeda.
6. HR/CEO memantau data dan kelengkapan dokumen melalui Karyawan. HR memvalidasi setelah pemeriksaan; baru kemudian status berubah menjadi aktif dan data tervalidasi tersedia melalui API payroll.
7. Arsip tidak boleh dibersihkan ketika masih ada kandidat berstatus menerima OL yang belum dipindahkan ke onboarding atau kandidat berstatus menunggu respons OL. Setelah terselesaikan, arsip/pembersihan dapat dilakukan tanpa menghapus master karyawan.

Perubahan berlaku untuk respons OL berikutnya; tidak mengubah atau menutup massal lowongan lama. Pembaruan ini berfokus pada transisi onboarding. Tahap review HR di antara Manajer dan CEO pada pengajuan MRF, serta penentuan jalur seleksi per kandidat setelah diskusi, belum diubah oleh pembaruan onboarding ini.
