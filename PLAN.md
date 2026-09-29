# PLAN.md — Web Portofolio PT Listrik Langit (Peta PLTS Indonesia)

> Status: Rencana awal — belum ada kode, repo masih kosong
> Terakhir update: 2026-09-29
> Keputusan domain: Organization Site `https://listriklangit.github.io/` (tanpa `/repo`)

## 1. Ringkasan

Membuat web portofolio statis untuk **PT Listrik Langit** (perusahaan PLTS) yang menampilkan:
- **Peta Indonesia interaktif** dengan titik-titik koordinat lokasi PLTS yang pernah dipasang.
- Setiap titik jika diklik menampilkan: **foto, video, kapasitas (kWp), tahun, tipe (On-grid/Off-grid/Hybrid), pelanggan, komentar/review.**
- Publik bisa melihat + memberi rating/review (dengan moderasi).
- Admin bisa tambah/edit/hapus titik tanpa edit kode.

**Constraint utama:** harus bisa jalan di **GitHub Pages** (= hosting statis saja, tidak bisa run PHP/Node.js backend).

**Keputusan arsitektur:** `HTML + JS Vanilla + Leaflet.js + Supabase` — ini sudah pilihan yang tepat. Tidak perlu ganti.

---

## 2. Apakah HTML+JS + Supabase Cocok untuk GitHub Pages?

**Jawaban singkat: Ya, sangat cocok. Lanjutkan.**

| Opsi Backend untuk GitHub Pages (statis) | Cocok? | Keterangan |
|---|---|---|
| **Supabase (Postgres + Storage + Auth) — Direkomendasikan** | ✅ Sangat cocok | Free tier generous, akses langsung dari JS via `supabase-js`, ada Auth + Storage foto/video, RLS untuk keamanan. Tanpa backend sendiri. |
| Firebase (Firestore + Storage) | ✅ Cocok | Alternatif valid, tapi pricing & query lebih kaku dibanding Postgres Supabase. |
| Google Sheets / Airtable sebagai CMS | ⚠️ Darurat saja | Gampang tapi tidak scalable, lambat, susah untuk foto/video + review. |
| JSON statis di repo (`data.json`) | ⚠️ MVP super murah | Tanpa backend sama sekali, tapi tiap tambah titik harus commit + redeploy. Tidak bisa ada review publik. Cocok hanya jika update < 1x/bulan dan tanpa review. |
| Cloudflare Pages + D1/R2 / Vercel / Netlify | ✅ Lebih powerful | Bisa serverless function, tapi keluar dari constraint "harus GitHub Pages". Jika nanti butuh SSR / API rahasia, pindah ke sini. |
| Backend sendiri (Laravel/Express) + VPS | ❌ Tidak bisa di GitHub Pages | Butuh server. Overkill untuk portofolio. |

**Saran final:**
- Tetap di **GitHub Pages + Supabase**. Jangan pakai framework build (React/Next/Vite) dulu — pakai **HTML + CSS + JS murni + Tailwind via CDN + Leaflet via CDN** agar deploy ke GitHub Pages semudah `git push`.
- Video **jangan disimpan sebagai file MP4 besar di Supabase Storage / repo**. pola terbaik: upload video ke **YouTube (Unlisted)** lalu simpan URL YouTube-nya di DB dan embed. Supabase Storage hanya untuk **foto (compress < 500KB)**. Alasan: limit GitHub Pages 1GB, limit bandwidth Supabase free 5GB/bulan.
- Jika nanti titik > 500 atau butuh SEO berat per-lokasi, migrasi ke Astro/Next.js static export (masih bisa di GitHub Pages) — tapi bukan sekarang.

---

## 3. Tujuan & Kriteria Sukses

1. User membuka `https://listriklangit.github.io/` → langsung lihat peta Indonesia dengan semua titik PLTS dalam < 3 detik.
2. Klik titik → popup ringkas → klik detail → modal dengan foto slider, video embed, spesifikasi, dan review.
3. Filter berfungsi: provinsi, tipe sistem, rentang kapasitas, tahun, search nama.
4. Admin login → bisa CRUD titik + upload foto + approve review tanpa sentuh kode.
5. Mobile responsive, bisa dibuka dari HP teknisi/pelanggan di lapangan.

---

## 4. Tech Stack Final ( MVP )

- **Hosting:** GitHub Pages **Organization Site** `https://listriklangit.github.io/` (repo `listriklangit.github.io` di dalam org `listriklangit`, branch `main` + folder `/docs` atau root). Custom domain opsional (`portofolio.listriklangit.id` via CNAME).
- **Frontend (tanpa build):**
  - `index.html`, `admin.html`, `css/style.css`, `js/config.js`, `js/app.js`, `js/admin.js`
  - Tailwind CSS via CDN (atau CSS murni agar ringan — pilih salah satu, disarankan Tailwind CDN untuk kecepatan dev).
  - **Leaflet 1.9.x** untuk peta + tile **OpenStreetMap / CartoDB Voyager** (gratis, tanpa API key). Jangan pakai Google Maps (butuh billing).
  - `supabase-js v2` via CDN (ESM import dari `cdn.jsdelivr.net`).
  - `markercluster` plugin Leaflet untuk grouping saat titik banyak.
- **Backend (BaaS):** Supabase
  - Postgres untuk data, Storage untuk foto, Auth (email+password) untuk admin, RLS untuk keamanan.
- **Media:**
  - Foto → Supabase Storage bucket `photos` (public read).
  - Video → YouTube Unlisted + embed (`youtube-nocookie.com`), simpan URL di DB.

---

## 5. Skema Database Supabase

Jalankan SQL ini di Supabase SQL Editor (sudah termasuk RLS):

```sql
-- Tabel utama titik PLTS
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- ex: "PLTS Atap Kantor Bupati Sumba 50 kWp"
  slug text unique,                      -- untuk SEO / share link #lokasi-slug
  province text not null,
  city text,
  lat double precision not null,         -- ex: -9.65
  lng double precision not null,         -- ex: 120.25
  capacity_kwp numeric not null,          -- ex: 50
  system_type text not null check (system_type in ('On-Grid','Off-Grid','Hybrid')),
  install_year int not null,
  client_name text,
  description text,
  cover_url text,                        -- foto utama (untuk marker popup)
  youtube_url text,                      -- link youtube, ex: https://youtu.be/xxxx
  is_published boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Foto tambahan (1 lokasi = N foto)
create table photos (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade not null,
  url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Review / komentar publik
create table reviews (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade not null,
  author_name text not null,
  rating int check (rating between 1 and 5),
  message text not null,
  is_approved boolean default false,     -- moderasi admin
  created_at timestamptz default now()
);

-- Enable RLS
alter table locations enable row level security;
alter table photos enable row level security;
alter table reviews enable row level security;

-- Policy: publik boleh baca yang published / approved saja
create policy "public read locations"
  on locations for select using (is_published = true);
create policy "public read photos"
  on photos for select using (true);
create policy "public read approved reviews"
  on reviews for select using (is_approved = true);

-- Policy: publik boleh insert review tapi tidak langsung approved
create policy "public insert review"
  on reviews for insert with check (is_approved = false);

-- Policy: admin (authenticated) full access
-- (Untuk MVP cukup cek auth.role() = 'authenticated'.
--  Untuk produksi, buat tabel profiles + role = 'admin')
create policy "admin all locations"
  on locations for all using (auth.role() = 'authenticated');
create policy "admin all photos"
  on photos for all using (auth.role() = 'authenticated');
create policy "admin all reviews"
  on reviews for all using (auth.role() = 'authenticated');

-- Storage: buat bucket 'photos' (Public) via Dashboard > Storage
-- Policy storage: public read, authenticated write (atur via Dashboard > Storage > Policies)
```

Indeks tambahan (opsional tapi disarankan):
```sql
create index idx_locations_province on locations(province);
create index idx_locations_year on locations(install_year);
create index idx_reviews_location on reviews(location_id);
```

Data awal: siapkan 5–10 titik dummy dengan koordinat asli Indonesia untuk testing marker.

---

## 6. Struktur File (GitHub Pages Organization Site)

Repo deploy WAJIB bernama persis `listriklangit.github.io` di dalam org `listriklangit`.
Folder lokal dev sudah diganti dari `web_profile` → `listriklangit`.

```
listriklangit.github.io/   <-- nama repo, milik org github.com/listriklangit
  /docs/                  <-- publish folder untuk GitHub Pages (Settings > Pages > Deploy from branch: main /docs)
  index.html            <-- peta publik + list + modal detail
  admin.html            <-- panel admin (login + CRUD + approve review)
  css/style.css
  js/config.js          <-- SUPABASE_URL + SUPABASE_ANON_KEY (anon key aman untuk publik)
  js/app.js             <-- logic peta publik
  js/admin.js           <-- logic admin
  favicon.ico
  logo.png
/.nojekyll             <-- (di dalam /docs) agar file _* tidak diabaikan Jekyll
CNAME (opsional)        <-- jika pakai domain sendiri
PLAN.md (file ini)
```

**Kenapa `/docs`?** Cara deploy GitHub Pages paling sederhana tanpa GitHub Actions. Alternatif: root `/` langsung. Pilih salah satu dan konsisten.
Karena ini Organization Site (domain root `/`), path asset boleh absolut (`/css/style.css`) maupun relatif (`./css/style.css`) — keduanya aman. Tetap disarankan relatif agar aman jika nanti pindah ke custom domain / project site.

`config.js` contoh:
```js
const SUPABASE_URL = "https://xyzcompany.supabase.co";
const SUPABASE_ANON_KEY = "eyJ... (anon public, bukan service_role!)";
```

> ⚠️ Jangan pernah taruh `service_role` key di frontend. Hanya `anon` key.

---

## 7. Desain Halaman Publik (`index.html`)

1. **Header:** logo PT Listrik Langit, nav (Beranda, Peta, Statistik, Tentang, Kontak/WA), tombol "Admin".
2. **Hero ringkas:** headline + 3 statistik otomatis (total titik, total kWp, provinsi terjangkau) — dihitung dari Supabase.
3. **Section Peta (inti):**
   - Leaflet map, view awal **dikunci pas se-Indonesia**: `center [-2.5, 118]`, `zoom 5`, `minZoom 5`, `maxZoom 18`.
   - **Batas geser Indonesia (user tidak boleh keluar area):** `maxBounds: [[-11.5, 94.5], [6.5, 141.5]]` + `maxBoundsViscosity: 1.0`. Panning/zoom yang keluar bbox otomatis mental balik. Zoom-in ke titik PLTS tetap bebas (sampai `maxZoom 18`), yang dibatasi hanya keluar wilayah Indonesia.
   - **Zoom control di pojok kanan bawah:** `zoomControl: false` + `L.control.zoom({ position: 'bottomright' })`. Alasan: kiri atas sudah dipakai logo, kanan bawah tidak menutupi popup/marker.
   - **Logo overlay pojok kiri atas peta:** custom `L.Control` posisi `topleft` berisi `logo.png` PT Listrik Langit (±120px, background putih rounded + shadow, klik → `map.flyTo([-2.5,118], 5)` reset view Indonesia). Z-index di atas tile/marker, tidak bentrok dengan zoom control.
   - `worldCopyJump: false`, `minZoom 5` cegah zoom-out ke tampilan dunia.
   - Tile: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`.
   - Marker: circleMarker berwarna beda per `system_type`, atau custom icon panel surya. Gunakan `L.markerClusterGroup()` jika > 50 titik.
   - Popup singkat: foto cover, nama, kapasitas, provinsi → tombol "Lihat Detail".
4. **Filter bar:** search text, dropdown provinsi (auto dari data), tipe sistem, tahun, min–max kWp. Filter jalan client-side setelah fetch (cepat untuk < 1000 titik).
5. **Sidebar/list kartu:** grid kartu lokasi (foto, nama, badge kWp) sinkron dengan filter + klik kartu → map flyTo + buka modal.
6. **Modal Detail Lokasi:**
   - Slider foto (cover + tabel `photos`).
   - Embed YouTube (convert `youtu.be`/`watch?v=` → `youtube-nocookie.com/embed/`).
   - Spek: kapasitas, tipe, tahun, klien, deskripsi, koordinat + tombol "Rute (Google Maps)".
   - List review approved (bintang + komentar) + form "Tulis Review" (nama, rating, pesan → insert dengan `is_approved=false` + pesan "menunggu moderasi").
7. **Footer:** alamat, kontak, link sosial media.

Share link: pakai hash `#lokasi=<slug>` agar titik bisa di-share WA.

---

## 8. Desain Halaman Admin (`admin.html`)

- Akses: `admin.html` → login Supabase Auth (email+password, akun dibuat manual di Dashboard). Tidak ada register publik.
- Fitur:
  1. Tabel lokasi (search + edit/hapus/publish-toggle).
  2. Form tambah/edit: nama, provinsi (dropdown 38 provinsi), kota, lat/lng (dengan **map picker**: klik peta untuk isi lat/lng otomatis), kapasitas, tipe, tahun, klien, deskripsi, youtube_url, cover upload.
  3. Upload foto: `<input type=file multiple>` → compress di browser (canvas max 1600px, quality 0.8) → upload ke bucket `photos` → insert ke tabel `photos`.
  4. Moderasi review: list `is_approved=false` → Approve / Hapus.
- Semua operasi pakai `supabase.auth.getSession()` + RLS `authenticated`.

---

## 9. Keamanan

- [ ] RLS aktif di semua tabel (lihat SQL §5).
- [ ] Bucket `photos`: public read, hanya authenticated yang bisa write/delete.
- [ ] Validasi input review (max length, escape HTML untuk cegah XSS — pakai `textContent`, jangan `innerHTML` untuk data user).
- [ ] Batasi ukuran & tipe file upload (jpg/png/webp, < 5MB sebelum compress).
- [ ] (Opsional tahap 2) Rate-limit review via Supabase Edge Function / Cloudflare Turnstile agar tidak spam.

---

## 10. Langkah Deploy GitHub Pages (Organization Site — tanpa `/repo`)

Target akhir: `https://listriklangit.github.io/` langsung.

1. Buat / buka organization `github.com/listriklangit` (nama org = `listriklangit`).
2. Di dalam org tersebut, buat repo **baru** bernama persis: `listriklangit.github.io` (public, bukan `listriklangit` saja).
   - URL repo: `https://github.com/listriklangit/listriklangit.github.io`
   - URL live: `https://listriklangit.github.io/` (tanpa `/repo`).
   - Hanya 1 repo spesial ini per org yang bisa jadi domain root. Repo lain tetap jadi `listriklangit.github.io/<nama-repo>/`.
3. Taruh semua frontend di folder `/docs/` + file `/docs/.nojekyll` (kosong).
   - Alternatif: taruh di root repo + Pages source `main / (root)`. Pilih salah satu.
4. Push ke branch `main` repo deploy (perintah eksplisit):
   ```bash
   # Opsi A: folder ini jadi clone langsung dari repo deploy
   git init -b main
   git remote add origin https://github.com/listriklangit/listriklangit.github.io.git
   git add .
   git commit -m "init: portofolio peta PLTS"
   git push -u origin main

   # Opsi B: folder lokal `listriklangit` (dev) tetap terpisah, tambah remote deploy saja
   git remote add deploy https://github.com/listriklangit/listriklangit.github.io.git
   git push deploy main
   ```
   - Jangan push repo lokal `listriklangit` ke repo lain untuk live domain root — yang live hanya repo `listriklangit.github.io`.
5. Di repo `listriklangit.github.io` → Settings → Pages → Source: `Deploy from a branch` → Branch: `main` + folder `/docs` → Save.
6. Tunggu 1–3 menit → buka `https://listriklangit.github.io/`. Admin di `https://listriklangit.github.io/admin.html`.
7. Folder lokal `listriklangit` (ex-`web_profile`) dipakai untuk development, hasil final di-push ke repo `listriklangit.github.io` saat rilis.
8. (Opsional) Custom domain: tambah file `/docs/CNAME` berisi `portofolio.listriklangit.id` + setting DNS CNAME ke `listriklangit.github.io` + enforce HTTPS.

---

## 11. Tahapan Pengerjaan (Estimasi)

| Tahap | Isi | Output |
|---|---|---|
| 0. Setup (0.5 hari) | Buat project Supabase, jalankan SQL §5, buat bucket, buat user admin, buat repo + `/docs` | Supabase siap, repo siap |
| 1. Peta Publik (2–3 hari) | `index.html` + Leaflet + fetch Supabase + marker + popup + filter + statistik | Peta bisa diklik |
| 2. Modal Detail + Review (1–2 hari) | Slider foto, embed YouTube, list + form review | Portofolio lengkap per titik |
| 3. Admin Panel (2 hari) | Login + CRUD + map picker + upload + moderasi | Admin mandiri tanpa kode |
| 4. Polish + Deploy (1 hari) | Responsive, SEO meta, favicon, `.nojekyll`, path relatif, test HP, deploy Pages | Live di GitHub Pages |
| 5. (Opsional) | Clustering, share-link hash, PWA, Turnstile anti-spam, custom domain | — |

Total MVP: **~5–7 hari kerja** untuk 1 dev.

---

## 12. Risiko & Mitigasi

- **Koordinat tidak akurat** → gunakan map picker di admin + tombol "Rute" untuk verifikasi lapangan.
- **Foto/video berat → lambat & jebol kuota** → compress foto, video wajib via YouTube embed.
- **Spam review** → default `is_approved=false` + moderasi admin (wajib).
- **Anon key terekspos** → itu normal untuk Supabase frontend; keamanan mengandalkan RLS, bukan menyembunyikan key.
- **Tile OSM lambat** → sediakan fallback tile (Carto → OSM → Esri WorldImagery untuk mode satelit).

---

## 13. Keputusan yang Perlu Dikunci Sebelum Coding

- [ ] Logo, warna brand, dan nama domain (atau pakai `*.github.io` dulu)?
- [ ] Daftar awal 10 lokasi + foto + koordinat + link YouTube (siapkan di spreadsheet dulu)?
- [ ] Apakah publik boleh submit review, atau review hanya ditulis admin (testimoni statis)? — disarankan: publik boleh, tapi moderasi.
- [ ] Bahasa: Indonesia saja atau ID/EN?
- [ ] Perlu halaman company profile (tentang, layanan, kontak) gabung satu web atau pisah?

---

## 14. Perintah Mulai (Next Action)

1. Buat project di https://supabase.com → copy `URL` + `anon key` → isi ke `docs/js/config.js`.
2. Jalankan SQL §5 di Supabase SQL Editor.
3. Minta AI/dev untuk generate `docs/index.html`, `docs/admin.html`, `docs/js/app.js`, `docs/js/admin.js` berdasarkan PLAN ini.
4. Isi 5 data dummy → test peta → deploy ke GitHub Pages (§10).
