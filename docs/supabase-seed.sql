-- docs/supabase-seed.sql — 8 titik dummy koordinat asli. Jalankan SETELAH schema. Ganti cover_url setelah upload foto.
insert into locations (name, slug, province, city, lat, lng, capacity_kwp, system_type, install_year, client_name, description, youtube_url) values
('PLTS Atap Surabaya 50 kWp','plts-atap-surabaya-50kwp','Jawa Timur','Surabaya',-7.2575,112.7521,50,'Hybrid',2023,'PT Maju Jaya','PLTS atap industri 50 kWp dengan monitoring online.','https://youtu.be/dQw4w9WgXcQ'),
('PLTS Sumba Off-Grid 25 kWp','plts-sumba-offgrid-25kwp','Nusa Tenggara Timur','Sumba Timur',-9.65,120.25,25,'Off-Grid',2022,'Desa Adat Prailiu','Sistem off-grid + baterai untuk desa tanpa PLN.',''),
('PLTS Villa Bali 10 kWp','plts-villa-bali-10kwp','Bali','Denpasar',-8.65,115.22,10,'On-Grid',2024,'Villa Langit','PLTS atap villa 10 kWp on-grid.',''),
('PLTS Lombok Hybrid 33 kWp','plts-lombok-hybrid-33kwp','Nusa Tenggara Barat','Mataram',-8.58,116.11,33,'Hybrid',2023,'Hotel Pantai','Hybrid 33 kWp untuk backup + hemat siang hari.',''),
('PLTS Makassar 100 kWp','plts-makassar-100kwp','Sulawesi Selatan','Makassar',-5.1477,119.4327,100,'On-Grid',2021,'Kantor Bupati','PLTS ground-mounted 100 kWp gedung pemerintah.',''),
('PLTS Balikpapan 75 kWp','plts-balikpapan-75kwp','Kalimantan Timur','Balikpapan',-1.2675,116.8285,75,'On-Grid',2022,'Sekolah Alam','PLTS atap sekolah 75 kWp.',''),
('PLTS Jayapura 20 kWp','plts-jayapura-20kwp','Papua','Jayapura',-2.5337,140.7181,20,'Off-Grid',2023,'Puskesmas','Off-grid 20 kWp untuk puskesmas.',''),
('PLTS Yogyakarta 15 kWp','plts-yogyakarta-15kwp','DI Yogyakarta','Sleman',-7.7956,110.3695,15,'On-Grid',2024,'Kafe Tani','PLTS atap kafe 15 kWp.','');
