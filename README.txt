FIX PHOTOSTRIP KEMBALI KE INDEX

Ganti hanya:
1. template.html
2. login.html

Penyebab:
- template.html memverifikasi session dua kali sehingga bisa memicu redirect berantai.
- login.html mengarahkan session valid selalu ke /, tanpa menghormati parameter next=/template.

Sesudah deploy, lakukan hard refresh atau hapus cache service worker.
