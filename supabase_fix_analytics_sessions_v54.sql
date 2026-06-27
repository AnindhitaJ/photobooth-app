-- Lux Photobooth — Fix Analytics Session Count v54
-- Opsional tapi disarankan kalau analytics sempat ngitung foto satuan/GIF/manifest/live sebagai session.
-- Ini hanya menghapus metadata row di photo_sessions, bukan file storage.

delete from public.photo_sessions
where file_path like 'results/%'
  and not (
    file_path like '%_strip.jpg'
    or file_path like '%/strip.jpg'
  );

-- Setelah ini, analytics akan lebih mendekati jumlah sesi final result.
-- Untuk data baru, app v54 hanya insert photo_sessions saat final strip/photobox result selesai.
