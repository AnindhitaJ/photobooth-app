# Perbaikan Galeri Photobox 4R dan Merge 2 Foto

## Diagnosis

### 1. Photobox 4R terbaca sebagai Photostrip

`gallery.html` menentukan jenis produk dari kolom berikut pada tabel `photo_sessions`:

- `product_type`
- `template_name`
- `template_category`

Namun, fungsi `uploadToSupabase()` di `result.html` sebelumnya hanya menyimpan:

- `user_id`
- `file_path`
- `created_at`

Akibatnya, `product_type` kosong. Fungsi `normalizeProductType()` di galeri kemudian memakai fallback default `photostrip`, walaupun hasil sebenarnya Photobox 4R.

Nama file final tidak dapat dipakai sebagai pembeda karena Photostrip dan Photobox sama-sama disimpan dengan suffix `_strip.jpg`.

### 2. Error `Gagal load` saat menggabungkan dua foto

Proses merge pada `gallery.html` memuat gambar menggunakan:

```js
img.crossOrigin = 'anonymous';
```

Cara ini diperlukan agar gambar dapat digambar ke Canvas. Jika Cloudflare R2/custom media domain tidak mengirim header CORS yang cocok dengan origin aplikasi, gambar masih mungkin tampil pada elemen `<img>`, tetapi gagal dimuat untuk Canvas. Handler lama hanya menghasilkan pesan umum `Gagal load`, sehingga penyebab aslinya tidak terlihat.

## Perubahan

### `result.html`

Metadata setiap file hasil sekarang menyimpan:

- `product_type`
- `session_id`
- `template_name`
- `template_category`
- `photo_count`

Respons insert Supabase juga diperiksa. Error metadata tidak lagi diam-diam diabaikan tanpa detail log.

### `gallery.html`

- Sesi lama tanpa metadata produk dikenali melalui rasio gambar final.
- Photobox 4R portrait memiliki rasio sekitar `0,667`.
- Photostrip memiliki rasio sekitar `0,333`.
- Merge mencoba gambar CDN langsung terlebih dahulu.
- Jika CORS gagal, gambar dimuat melalui `/api/media-proxy`.
- Pembuatan Blob hasil merge sekarang diperiksa agar kegagalan Canvas menghasilkan pesan yang jelas.

### `api/media-proxy.js`

Endpoint proxy same-origin baru untuk mengambil gambar dari host media yang diizinkan. Host dibatasi ke:

- `media.lux-photo.web.id`
- host dari `R2_PUBLIC_URL`
- host dari `SUPABASE_URL`

Pembatasan ini mencegah endpoint menjadi proxy terbuka/SSRF.

### `supabase_fix_gallery_product_type_v74.sql`

SQL untuk menormalkan sesi lama yang masih memiliki petunjuk Photobox/4R pada metadata template. Sesi yang sama sekali tidak memiliki metadata dipulihkan oleh logika rasio gambar di browser.

## Deployment

1. Ganti `result.html` dan `gallery.html` dengan versi terbaru.
2. Tambahkan `api/media-proxy.js`.
3. Deploy ulang ke Vercel.
4. Jalankan `supabase_fix_gallery_product_type_v74.sql` di Supabase SQL Editor.
5. Pastikan CORS bucket R2 tetap mengizinkan:
   - `https://lux-photo.web.id`
   - `https://www.lux-photo.web.id`
6. Setelah mengubah CORS, purge cache custom domain R2/Cloudflare bila header lama masih tersimpan.

## Pemeriksaan

Di DevTools Console/Network:

1. Buat satu sesi Photobox 4R baru.
2. Buka Galeri dan pastikan badge menjadi `Photobox 4R`.
3. Pilih dua Photostrip dan jalankan print merge.
4. Jika CDN langsung gagal, request `/api/media-proxy?src=...` harus berstatus `200` dan bertipe `image/jpeg` atau `image/png`.
5. Periksa tabel `photo_sessions`; row baru harus memiliki `product_type = photobox` atau `photostrip`.
