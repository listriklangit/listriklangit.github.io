-- docs/supabase-schema.sql — jalankan di Supabase Dashboard > SQL Editor.
-- 1) Jalankan file ini. 2) Buat bucket 'photos' (Public) via Storage. 3) Buat user admin via Authentication > Users.

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  province text not null,
  city text,
  lat double precision not null,
  lng double precision not null,
  capacity_kwp numeric not null,
  system_type text not null check (system_type in ('On-Grid','Off-Grid','Hybrid')),
  install_year int not null,
  client_name text,
  description text,
  cover_url text,
  youtube_url text,
  is_published boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade not null,
  url text not null,
  caption text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade not null,
  author_name text not null,
  rating int check (rating between 1 and 5),
  message text not null,
  is_approved boolean default false,
  created_at timestamptz default now()
);

alter table locations enable row level security;
alter table photos enable row level security;
alter table reviews enable row level security;

create policy "public read locations" on locations for select using (is_published = true);
create policy "public read photos" on photos for select using (true);
create policy "public read approved reviews" on reviews for select using (is_approved = true);
create policy "public insert review" on reviews for insert with check (is_approved = false);

create policy "admin all locations" on locations for all using (auth.role() = 'authenticated');
create policy "admin all photos" on photos for all using (auth.role() = 'authenticated');
create policy "admin all reviews" on reviews for all using (auth.role() = 'authenticated');

create index idx_locations_province on locations(province);
create index idx_locations_year on locations(install_year);
create index idx_reviews_location on reviews(location_id);
