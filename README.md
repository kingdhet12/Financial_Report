# RESBI - Resa & Bebi Financial

**RESBI** adalah web app financial planner pasangan untuk mencatat pemasukan, pengeluaran, investasi, saldo rekening, wishlist, pengeluaran tetap, paylater, dan laporan keuangan.

Tech stack:

- HTML5
- CSS3
- Vanilla JavaScript ES6 Modules
- Supabase Authentication, Database, Storage
- Chart.js
- Font Awesome
- Google Font Poppins

Tidak memakai React, Vue, Angular, Bootstrap, Tailwind, Laravel, atau Node.js.

## Struktur Project

```text
/
├── index.html
├── login.html
├── dashboard.html
├── style.css
├── config.js
├── supabase.js
├── auth.js
├── dashboard.js
├── transaction.js
├── fixedExpense.js
├── wishlist.js
├── paylater.js
├── balance.js
├── report.js
├── utils.js
├── database.sql
├── README.md
└── assets/
    ├── images/
    ├── icons/
    └── logo/
```

## Instalasi

1. Buka folder project.
2. Isi konfigurasi Supabase di `config.js`.
3. Buka `index.html` di browser.
4. Login menggunakan akun Supabase Authentication.

Mode demo lokal tersedia jika Supabase belum diisi:

```text
Email    : bebi@resbi.local
Password : resa12345
```

## Konfigurasi Supabase

Edit `config.js`:

```js
export const CONFIG = {
  SUPABASE_URL: "https://PROJECT_ID.supabase.co",
  SUPABASE_ANON_KEY: "SUPABASE_ANON_KEY_ANDA",
  SUPABASE_STORAGE_BUCKET: "resbi-attachments"
};
```

Lalu:

1. Buka Supabase Dashboard.
2. Buka Authentication > Users.
3. Buat user untuk Bebi/Resa.
4. Buka SQL Editor.
5. Jalankan seluruh isi `database.sql`.
6. Buka `index.html`, lalu login.

Catatan: seed data dummy SQL akan memakai user pertama di Supabase Auth. Jika SQL dijalankan sebelum user dibuat, buat user dulu lalu jalankan ulang bagian seed atau jalankan ulang seluruh SQL.

## Cara Login

- Jika Supabase aktif, gunakan email dan password dari Supabase Authentication.
- Jika Supabase kosong, gunakan akun demo lokal.
- Tombol Logout tersedia di sidebar dashboard.
- Session Supabase disimpan oleh Supabase SDK.

## Struktur Database

File `database.sql` membuat tabel:

- `users`
- `transactions`
- `fixed_expenses`
- `wishlist`
- `paylater`
- `balances`
- `settings`

Semua tabel memakai UUID, `created_at`, `user_id`, dan Row Level Security. Policy membatasi data agar hanya user login yang bisa membaca dan mengelola datanya sendiri.

## Dummy Data

`database.sql` menyediakan:

- 100 transaksi dummy
- 20 wishlist dummy
- 10 paylater dummy
- 10 pengeluaran tetap dummy
- saldo awal Bebi dan Resa untuk BCA, ShopeePay, Blu BCA, BTN, DANA, GoPay, SeaBank, dan Cash

Mode lokal juga membuat dummy data otomatis di `localStorage`.

## Backup Database

Opsi Supabase:

1. Buka Supabase Dashboard.
2. Masuk ke Project Settings > Database.
3. Gunakan fitur backup bawaan Supabase sesuai plan project.

Opsi SQL:

```sql
select *
from public.transactions
where user_id = auth.uid();
```

Opsi aplikasi:

- Buka menu Pengaturan.
- Klik `Backup JSON` untuk menyimpan data lokal sebagai file JSON.

## Restore Database

Opsi Supabase:

1. Restore dari backup Supabase Dashboard jika tersedia.
2. Atau import data manual menggunakan SQL Editor.

Opsi aplikasi:

- Buka menu Pengaturan.
- Klik `Restore JSON`.
- Pilih file backup JSON RESBI.

Restore JSON ditujukan untuk mode lokal. Untuk Supabase production, gunakan SQL import atau dashboard database tools.

## Deploy ke GitHub Pages

1. Upload semua file ke repository GitHub.
2. Buka Settings > Pages.
3. Pilih branch `main`.
4. Pilih folder `/root`.
5. Simpan dan buka URL GitHub Pages.

## Deploy ke Vercel

1. Login ke Vercel.
2. Import repository.
3. Framework Preset pilih `Other`.
4. Build Command kosongkan.
5. Output Directory isi `.`.
6. Deploy.

## Catatan ES Modules

Project ini memakai ES6 Modules sesuai request. Mayoritas browser modern dapat menjalankannya dari halaman statis. Jika browser memblokir module import dari `file://`, deploy ke GitHub Pages/Vercel atau buka lewat static server sederhana.

## Fitur

- Login Supabase Authentication
- Dashboard premium fintech
- Realtime clock dan tanggal
- Greeting `Halo Bebi ❤ Resa`
- CRUD transaksi
- CRUD pengeluaran tetap
- Generate pengeluaran tetap bulan ini
- CRUD wishlist
- CRUD paylater dengan hitung sisa bulan dan nominal
- CRUD saldo Bebi dan Resa
- Saldo otomatis berubah saat transaksi dibuat, diedit, atau dihapus
- Search realtime
- Filter bulan, tahun, kategori, jenis transaksi, sumber dana
- Sorting dan pagination
- Chart.js laporan harian, bulanan, kategori, sumber dana, investasi
- Export CSV
- Export Excel
- Print PDF
- Dark mode
- Floating action button
- Toast notification
- Confirm delete
- Skeleton loading
- Responsive table
- Empty state
