# Gallery Share v1.29

- Tombol Share Strip selalu membuka modal internal terlebih dahulu.
- Tidak bergantung pada dukungan `navigator.share` untuk merespons klik.
- Native share dipanggil hanya dari tombol khusus agar user activation tetap valid.
- Fallback permanen: WhatsApp, Salin Link, Download, dan Buka Foto.
- Native share yang ditolak browser tidak mengunci tombol/modal.
- Cache PWA: `lux-photobooth-v1.29-gallery-share-modal`.
