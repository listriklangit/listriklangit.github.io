// docs/js/config.js
// Isi setelah buat project di https://supabase.com
// Dashboard > Project Settings > API > copy URL + anon public key.
// PENTING: hanya pakai ANON key di frontend. Jangan pernah taruh service_role key di sini.
const SUPABASE_URL = "https://xyzcompany.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_ANON_KEY_ANDA_DI_SINI";

// Fallback data lokal: dipakai otomatis jika config masih placeholder / Supabase belum siap / offline.
// Biar peta tetap bisa didemo sebelum backend dikonfigurasi.
const USE_LOCAL_FALLBACK = true;
