/**
 * Public runtime configuration for the browser application.
 *
 * The Supabase anon key is intentionally public and may be committed.
 * Never place a service_role key or CRON_SECRET in this file.
 */
window.LUX_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://eguiubpsijwjwxaxvkhi.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndWl1YnBzaWp3and4YXh2a2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTM4NTcsImV4cCI6MjA5NDg4OTg1N30.jwFtqnsbWlhSEtEeF-ZTEBq63CUQpN4jHPRmFpY827o',
  SUPER_ADMIN_EMAIL: 'luxphotobooth.id@gmail.com',
  STORAGE_BUCKET: 'photobooth',
  APP_VERSION: 'redeploy-ready-v1.2-template-text'
});
