# Setup Google Search untuk LUX Photobooth

## Perubahan yang sudah diterapkan

- `/` menjadi landing page publik yang dapat diindeks.
- Dashboard dipindahkan ke `/app` dan tetap membutuhkan login.
- Halaman login dan halaman aplikasi menggunakan `noindex`.
- Ditambahkan `robots.txt`, `sitemap.xml`, canonical URL, Open Graph, dan structured data.
- PWA dimulai dari `/app`.

## Langkah setelah deploy

1. Deploy folder ini ke project Vercel yang memakai domain `www.lux-photo.web.id`.
2. Pastikan URL berikut dapat dibuka:
   - `https://www.lux-photo.web.id/`
   - `https://www.lux-photo.web.id/robots.txt`
   - `https://www.lux-photo.web.id/sitemap.xml`
   - `https://www.lux-photo.web.id/app`
3. Tambahkan domain `lux-photo.web.id` ke Google Search Console menggunakan **Domain property** dan verifikasi lewat DNS TXT.
4. Buka menu **Sitemaps**, lalu kirim `https://www.lux-photo.web.id/sitemap.xml`.
5. Buka **URL Inspection**, periksa `https://www.lux-photo.web.id/`, jalankan **Test live URL**, lalu klik **Request indexing**.
6. Periksa kembali beberapa hari kemudian. Indexing tidak menjamin peringkat atas untuk kata kunci umum.

## Catatan

Jangan mengembalikan redirect otomatis dari `/` ke `/login`, karena Google akan kembali menganggap login sebagai halaman utama.
