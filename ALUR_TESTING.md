# Panduan Testing Sistem HR Gaharu Sempana Group

Panduan ini mencakup dua skenario utama: kandidat diterima sampai menjadi karyawan aktif,
dan kandidat yang ditolak di tahap screening awal.

---

## Persiapan

Jalankan server lokal terlebih dahulu:

```bash
npm run dev:all
```

Buka browser ke `http://localhost:5174`

### Akun tersedia (semua password: `password123`)

| Email | Peran | Divisi |
|---|---|---|
| `hr@gaharusempana.com` | HR | - |
| `admin@gaharusempana.com` | CEO | - |
| `manajer@gaharusempana.com` | Manajer | Sipil |
| `pic@gaharusempana.com` | PIC | Sipil |

### Cara lihat email di lokal

Karena mode lokal tidak kirim email sungguhan, semua email dicetak ke log terminal.
Untuk melihat tautan yang dikirim sistem:

```bash
cat /tmp/devall.log | grep -A5 "form-pelamar\|/ol/\|onboarding"
```

---

## Skenario 1 - Kandidat diterima sampai menjadi karyawan aktif

### Tahap 1: Buat MRF

1. Login sebagai **PIC** (`pic@gaharusempana.com`)
2. Buka menu **MRF** lalu klik **Buat MRF**
3. Isi form:
   - Divisi: `Sipil`
   - Jalur seleksi: `Fast` (langsung wawancara tanpa uji kompetensi)
   - Jumlah kebutuhan: `1`
   - Alasan kebutuhan: bebas
4. Klik **Simpan** - status MRF menjadi `Draft`
5. Klik **Ajukan** - status berubah menjadi `Menunggu Manajer`

### Tahap 2: Manajer setujui MRF

6. Logout, login sebagai **Manajer** (`manajer@gaharusempana.com`)
7. Buka menu **MRF**, buka MRF yang baru masuk
8. Klik **Setujui** - status berubah menjadi `Menunggu CEO`

### Tahap 3: CEO setujui MRF

9. Logout, login sebagai **CEO** (`admin@gaharusempana.com`)
10. Buka menu **MRF**, buka MRF tersebut
11. Klik **Setujui** - status berubah menjadi `Disetujui`

### Tahap 4: HR buka lowongan

12. Logout, login sebagai **HR** (`hr@gaharusempana.com`)
13. Buka menu **Lowongan**, klik **Buka Lowongan**
14. Pilih MRF yang baru disetujui, isi nama posisi dan deskripsi
15. Klik **Simpan** - lowongan terbuka dan tautan pendaftaran tersedia
16. Salin **Tautan Pendaftaran** yang muncul di halaman detail lowongan

### Tahap 5: Pelamar mendaftar

17. Buka tab baru, tempel tautan pendaftaran tadi
18. Isi form lamaran:
    - Nama lengkap
    - Email (contoh: `calon1@contoh.com`)
    - Nomor HP
    - Unggah CV dalam format PDF (maks. 2 MB)
19. Klik **Kirim Lamaran**

### Tahap 6: HR screening awal

20. Kembali ke tab HR, buka **Lowongan** lalu buka lowongan tersebut
21. Buka tab **Pelamar**, klik nama pelamar
22. Lihat CV yang diunggah
23. Klik **Setujui** - sistem mengirim email berisi tautan Form Pelamar
24. Salin tautan Form Pelamar dari log terminal:
    ```bash
    cat /tmp/devall.log | grep "form-pelamar"
    ```

### Tahap 7: Pelamar isi Form Pelamar

25. Buka tautan Form Pelamar di tab baru (simulasi pelamar membuka email)
26. Isi semua seksi: data pribadi, pendidikan, pengalaman kerja, keluarga, dll.
27. Gambar tanda tangan di kotak tanda tangan atau unggah foto tanda tangan
28. Klik **Kirim**

### Tahap 8: HR shortlist kandidat

29. Kembali ke halaman detail pelamar (HR)
30. Klik **Shortlist** - kandidat masuk daftar shortlist
31. Klik **Panggil Wawancara** (tersedia karena jalur MRF adalah `fast`)

### Tahap 9: Catat hasil wawancara

32. Setelah wawancara berlangsung di luar sistem, catat hasilnya
33. Di halaman detail pelamar, klik **Catat Hasil Seleksi**
34. Isi:
    - Tahap: `Wawancara`
    - Hasil: `Lulus`
    - Catatan: bebas
35. Klik **Simpan** - status pelamar berubah menjadi `Offer Pending`

### Tahap 10: HR buat Offering Letter

36. Buka menu **Offering Letter**, klik **Buat OL**
37. Pilih pelamar yang berstatus `offer_pending`
38. Isi:
    - Posisi yang ditawarkan
    - Gaji
    - Tanggal mulai kerja
    - Isi body surat penawaran
39. Klik **Simpan** - status OL menjadi `Draft`
40. Klik **Ajukan ke CEO**

### Tahap 11: CEO setujui Offering Letter

41. Logout, login sebagai **CEO** (`admin@gaharusempana.com`)
42. Buka menu **Offering Letter**, buka OL yang menunggu persetujuan
43. Baca isi surat, klik **Setujui**

### Tahap 12: HR kirim OL ke kandidat

44. Logout, login sebagai **HR** (`hr@gaharusempana.com`)
45. Buka **Offering Letter**, buka OL yang sudah disetujui
46. Klik **Kirim ke Kandidat**
47. Salin tautan OL dari log terminal:
    ```bash
    cat /tmp/devall.log | grep "/ol/"
    ```

### Tahap 13: Kandidat terima Offering Letter

48. Buka tautan OL di tab baru (simulasi kandidat membuka email)
49. Baca isi surat penawaran
50. Klik **Setuju** lalu konfirmasi - kandidat menerima penawaran

### Tahap 14: HR buat data karyawan

51. Kembali ke HR, buka menu **Karyawan**, klik **Tambah Karyawan**
52. Isi:
    - Nama lengkap (sama dengan nama pelamar)
    - Posisi
    - Divisi
    - Status kepegawaian: `PKWT`
    - Gaji
    - Tanggal mulai dan selesai kontrak
53. Klik **Simpan** - karyawan masuk dengan status `Onboarding`

### Tahap 15: HR generate tautan onboarding

54. Klik nama karyawan untuk membuka halaman detail
55. Klik **Buat Link Onboarding**
56. URL onboarding muncul di halaman - salin URL tersebut

### Tahap 16: Karyawan isi form onboarding

57. Buka URL onboarding di tab baru (simulasi karyawan di hari pertama kerja)
58. Isi semua data:
    - NIK (16 digit)
    - Email pribadi
    - Nomor HP
    - Tanggal lahir, tempat lahir, alamat
    - Agama, status pernikahan
    - Nomor NPWP, nomor BPJS
    - Kontak darurat
59. Unggah dokumen:
    - KTP (wajib, PDF/JPG/PNG maks. 2 MB)
    - BPJS, ijazah, pasfoto (opsional)
60. Klik **Kirim Data**

### Tahap 17: HR validasi karyawan

61. Kembali ke halaman detail karyawan sebagai HR
62. Refresh halaman - data yang diisi karyawan sudah tampil
63. Periksa setiap dokumen dengan klik **Lihat**
64. Klik **Validasi Karyawan** lalu konfirmasi
65. Status berubah menjadi **Aktif** - karyawan sudah terdaftar penuh dan datanya dapat dibaca Simatra

---

## Skenario 2 - Kandidat ditolak di screening awal

1. Ulangi Tahap 1-5 dari Skenario 1 menggunakan email pelamar berbeda (contoh: `calon2@contoh.com`)
2. Di Tahap 6, setelah membuka halaman detail pelamar, klik **Tolak** sebagai ganti Setujui
3. Isi alasan penolakan
4. Klik **Konfirmasi** - sistem otomatis mengirim email penolakan dan data pelamar dihapus dari server
5. Pelamar tidak dapat melanjutkan ke tahap berikutnya

---

## Skenario 3 - CEO minta revisi Offering Letter

Lakukan Tahap 1-10 dari Skenario 1, lalu:

1. Di Tahap 11, CEO klik **Minta Revisi** sebagai ganti Setujui
2. Isi komentar revisi (wajib)
3. HR menerima notifikasi OL dikembalikan dengan catatan
4. HR buka OL tersebut, baca komentar CEO, edit isi surat
5. Klik **Ajukan Ulang ke CEO**
6. CEO buka kembali dan klik **Setujui**
7. Lanjutkan ke Tahap 12

---

## Catatan

- Semua email (Form Pelamar, OL, penolakan) tidak dikirim sungguhan di lokal - cek di log terminal
- Tautan Form Pelamar berlaku 3 hari kerja
- Tautan Offering Letter berlaku 7 hari kalender
- Tautan onboarding karyawan berlaku 7 hari kalender
- Karyawan yang sudah divalidasi (status Aktif) datanya terlihat oleh Simatra lewat view `v_simatra_employees`
- Perubahan data karyawan aktif oleh HR dicatat otomatis di tabel `audit_logs`
