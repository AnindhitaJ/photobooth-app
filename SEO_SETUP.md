# Setup Google Search untuk LUX Photobooth

## Struktur halaman saat ini

- `/` langsung mengarahkan pengguna ke `/login`.
- `/login` adalah halaman awal pengguna dan menggunakan `noindex`.
- Dashboard berada di `/app` dan tetap membutuhkan login.
- Informasi publik aplikasi dipindahkan ke `/about`.
- `/about` memuat canonical URL, Open Graph, structured data, dan dapat diindeks.
- `sitemap.xml` mengarahkan mesin pencari ke `/about`, bukan ke halaman login.
- PWA tetap dimulai dari `/app`; pengguna tanpa sesi akan diarahkan ke login.

## Langkah setelah deploy

1. Deploy folder ini ke project Vercel yang memakai domain `www.lux-photo.web.id`.
2. Pastikan URL berikut dapat dibuka:
   - `https://www.lux-photo.web.id/` dan berakhir di `/login`
   - `https://www.lux-photo.web.id/about`
   - `https://www.lux-photo.web.id/robots.txt`
   - `https://www.lux-photo.web.id/sitemap.xml`
   - `https://www.lux-photo.web.id/app`
3. Tambahkan domain `lux-photo.web.id` ke Google Search Console menggunakan **Domain property** dan verifikasi lewat DNS TXT.
4. Buka menu **Sitemaps**, lalu kirim `https://www.lux-photo.web.id/sitemap.xml`.
5. Gunakan **URL Inspection** untuk memeriksa `https://www.lux-photo.web.id/about`, jalankan **Test live URL**, lalu klik **Request indexing**.
6. Jangan meminta indexing untuk `/login` atau `/app` karena keduanya bukan halaman publik untuk hasil pencarian.

## Catatan

Perubahan root menjadi login mengurangi fungsi SEO halaman utama. Halaman `/about` dipertahankan sebagai halaman informasi publik yang dapat ditemukan mesin pencari.
