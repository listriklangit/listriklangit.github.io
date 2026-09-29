# Walkthrough — Step Selanjutnya (PT Listrik Langit)

> Kode MVP sudah diimplementasikan sesuai `PLAN.md`. Repo lokal masih **tanpa remote** — ikuti langkah 0 untuk menyambungkan ke GitHub.

## Yang sudah jadi di commit ini

```
docs/
  index.html            # peta publik + filter + kartu + modal detail + review
  admin.html            # login + tabel CRUD + form + map picker + moderasi
  css/style.css
  js/config.js          # masih PLACEHOLDER, wajib diisi
  js/app.js             # Leaflet + Supabase + fallback lokal
  js/admin.js           # auth + CRUD + compress upload + moderasi
  js/fallback-data.js   # 8 titik demo agar peta langsung terlihat tanpa Supabase
  supabase-schema.sql   # skema + RLS (§5 PLAN.md)
  supabase-seed.sql     # 8 titik dummy koordinat asli
  logo.svg / favicon.svg# placeholder (ganti dengan logo asli → timpa file yang sama)
  .nojekyll             # agar GitHub Pages tidak memproses Jekyll
```

Spesifikasi PLAN.md yang dipenuhi: center `[-2.5,118]` zoom 5, `minZoom 5 / maxZoom 18`,
`maxBounds [[-11.5,94.5],[6.5,141.5]]`, zoom control kanan-bawah, logo overlay kiri-atas
klik → reset Indonesia, tile Carto Voyager, marker cluster, popup → modal
(foto slider, YouTube nocookie embed, spek, rute GMaps, review + form),
filter provinsi/tipe/tahun/search/min-max kWp client-side, statistik otomatis,
share `#lokasi=<slug>`, XSS-safe (`textContent`), upload jpg/png/webp &lt;5MB
+ compress canvas max 1600px q0.8, video via YouTube (bukan Storage).

## 0. Sambungkan repo lokal ke GitHub (belum ada remote!)

```bash
git remote -v   # saat ini kosong
# Buat org + repo deploy DULU di github.com (lihat langkah 4),
# lalu misalnya:
git remote add origin https://github.com/<user-atau-org>/<repo>.git
git branch -M main
git push -u origin main
```

> Repo ini dibuat dengan branch `master` default. Disarankan pindah ke `main`
> (`git branch -M main`) agar cocok dengan setting GitHub Pages di PLAN.md §10.

## 1. Setup Supabase (0.5 hari)

1. Buat project di https://supabase.com → copy **Project URL** + **anon public key**.
2. SQL Editor → jalankan `docs/supabase-schema.sql` → jalankan `docs/supabase-seed.sql`.
3. Storage → New bucket `photos` → **Public** → Policies: public read, authenticated write/delete.
4. Authentication → Users → Add user (email+password admin).
5. Isi `docs/js/config.js`:
   ```js
   const SUPABASE_URL = "https://xyzcompany.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ…";
   ```
6. Jangan pernah pakai `service_role` key di frontend.

## 2. Test lokal

```bash
# dari folder repo
python -m http.server 8000 --directory docs
# buka http://localhost:8000/  dan  http://localhost:8000/admin.html
```

Checklist test:
- [ ] Peta terkunci Indonesia (tidak bisa geser keluar), zoom control kanan-bawah.
- [ ] 8 titik fallback muncul; setelah config diisi → data live dari Supabase.
- [ ] Filter + kartu + statistik + modal + video + review terkirim (status "menunggu moderasi").
- [ ] `admin.html` → login → tambah titik via klik peta → upload cover → publish → muncul di publik.
- [ ] Moderasi review: Approve → muncul di modal publik.

## 3. Ganti aset placeholder

- Timpa `docs/logo.svg` dengan logo asli (atau tambah `logo.png` + ubah 3 referensi:
  `index.html` header, `app.js` LogoControl, `admin.html` header).
- Ganti nomor WA `6281234567890`, alamat, email, sosmed di `index.html` footer.
- Ganti cover dummy: upload via admin (otomatis ke bucket `photos`).

## 4. Deploy GitHub Pages (Organization Site)

Target: `https://listriklangit.github.io/` (tanpa `/repo`).

1. Buat organization `listriklangit`, lalu repo **persis** `listriklangit.github.io` (public).
2. Push folder ini ke repo tersebut (`main`):
   ```bash
   git remote add deploy https://github.com/listriklangit/listriklangit.github.io.git
   git push deploy main
   ```
3. Repo deploy → Settings → Pages → Deploy from branch → `main` + `/docs` → Save.
4. Tunggu 1–3 menit → `https://listriklangit.github.io/` dan `/admin.html`.
5. Opsional custom domain: tambah `docs/CNAME` berisi `portofolio.listriklangit.id` + DNS CNAME → `listriklangit.github.io` + enforce HTTPS.

## 5. Operasional admin (tanpa kode)

Tambah titik: `admin.html` → tab Tambah → isi form → klik peta untuk lat/lng →
upload cover → Simpan. Edit/hapus/publish-toggle di tab Lokasi.
Moderasi: tab Moderasi review → Approve/Hapus. Video: upload ke YouTube (Unlisted),
paste link ke kolom YouTube URL.

## 6. Keamanan sebelum go-live

- [ ] RLS aktif (cek via SQL Editor).
- [ ] Bucket `photos` tidak bisa ditulis anonim (coba upload tanpa login → harus gagal).
- [ ] Review publik selalu `is_approved=false`.
- [ ] Tahap 2 (opsional): Turnstile/rate-limit, tabel `profiles` + role admin.

## Troubleshooting

| Gejala | Penyebab umum |
|---|---|
| Peta kosong + banner kuning | `config.js` masih placeholder → mode fallback (normal sebelum setup). |
| `Gagal memuat Supabase` | URL/key salah, tabel belum dibuat, atau RLS policy belum jalan. |
| Login gagal | User belum dibuat di Authentication, atau salah password. |
| Upload gagal | Bucket `photos` belum public / policy write belum authenticated. |
| Halaman 404 di Pages | Source bukan `/docs`, atau repo bukan `listriklangit.github.io` di org. |
