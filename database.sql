-- ==================================================
-- RESBI - Supabase Schema + RLS + Seed Data
-- Jalankan di Supabase SQL Editor.
-- Buat user Auth terlebih dahulu agar seed dummy masuk ke user pertama.
-- ==================================================

create extension if not exists "pgcrypto";

-- ==================================================
-- Tables
-- ==================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text default 'Bebi & Resa',
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  description text not null,
  source text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  type text not null check (type in ('Masuk', 'Pengeluaran', 'Investasi')),
  category text not null,
  recipient text not null check (recipient in ('Bebi', 'Resa', 'Berdua')),
  created_at timestamptz not null default now()
);

create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  due_date integer not null check (due_date between 1 and 31),
  category text not null,
  status text not null default 'Aktif' check (status in ('Aktif', 'Nonaktif')),
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description text not null,
  estimated_amount numeric(14, 2) not null check (estimated_amount >= 0),
  target_date date not null,
  status text not null default 'Belum' check (status in ('Belum', 'Proses', 'Selesai')),
  created_at timestamptz not null default now()
);

create table if not exists public.paylater (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description text not null,
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  tenor integer not null check (tenor > 0),
  last_payment_date date not null,
  monthly_amount numeric(14, 2) not null check (monthly_amount >= 0),
  payment_number integer not null default 0 check (payment_number >= 0),
  status text not null default 'Belum Lunas' check (status in ('Lunas', 'Belum Lunas')),
  created_at timestamptz not null default now()
);

create table if not exists public.balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner text not null check (owner in ('Bebi', 'Resa')),
  account text not null,
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, owner, account)
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ==================================================
-- Indexes
-- ==================================================
create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_category on public.transactions(category);
create index if not exists idx_fixed_expenses_user on public.fixed_expenses(user_id);
create index if not exists idx_wishlist_user on public.wishlist(user_id);
create index if not exists idx_paylater_user on public.paylater(user_id);
create index if not exists idx_balances_user on public.balances(user_id);
create index if not exists idx_settings_user_key on public.settings(user_id, key);

-- ==================================================
-- Grants
-- ==================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.users,
  public.transactions,
  public.fixed_expenses,
  public.wishlist,
  public.paylater,
  public.balances,
  public.settings
to authenticated;

-- ==================================================
-- Row Level Security
-- ==================================================
alter table public.users enable row level security;
alter table public.transactions enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.wishlist enable row level security;
alter table public.paylater enable row level security;
alter table public.balances enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can upsert own profile" on public.users;
create policy "Users can upsert own profile"
on public.users for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Users manage own transactions"
on public.transactions for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own fixed expenses" on public.fixed_expenses;
create policy "Users manage own fixed expenses"
on public.fixed_expenses for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own wishlist" on public.wishlist;
create policy "Users manage own wishlist"
on public.wishlist for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own paylater" on public.paylater;
create policy "Users manage own paylater"
on public.paylater for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own balances" on public.balances;
create policy "Users manage own balances"
on public.balances for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users manage own settings" on public.settings;
create policy "Users manage own settings"
on public.settings for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ==================================================
-- Storage
-- ==================================================
insert into storage.buckets (id, name, public)
values ('resbi-attachments', 'resbi-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users manage RESBI attachments" on storage.objects;
create policy "Authenticated users manage RESBI attachments"
on storage.objects for all
to authenticated
using (bucket_id = 'resbi-attachments')
with check (bucket_id = 'resbi-attachments');

-- ==================================================
-- Seed Demo Data
-- ==================================================
do $$
declare
  seed_owner uuid;
begin
  select id into seed_owner
  from auth.users
  order by created_at asc
  limit 1;

  if seed_owner is null then
    raise notice 'Seed dilewati: buat user Supabase Auth terlebih dahulu, lalu jalankan ulang bagian seed.';
    return;
  end if;

  insert into public.users (id, email, display_name)
  select id, email, 'Bebi & Resa'
  from auth.users
  where id = seed_owner
  on conflict (id) do update set email = excluded.email;

  insert into public.balances (user_id, owner, account, amount)
  values
    (seed_owner, 'Bebi', 'BCA', 8500000),
    (seed_owner, 'Bebi', 'ShopeePay', 450000),
    (seed_owner, 'Bebi', 'Blu BCA', 6200000),
    (seed_owner, 'Bebi', 'BTN', 12500000),
    (seed_owner, 'Bebi', 'DANA', 320000),
    (seed_owner, 'Bebi', 'GoPay', 280000),
    (seed_owner, 'Bebi', 'SeaBank', 3800000),
    (seed_owner, 'Bebi', 'Cash', 1750000),
    (seed_owner, 'Resa', 'BCA', 9200000),
    (seed_owner, 'Resa', 'ShopeePay', 350000),
    (seed_owner, 'Resa', 'Blu BCA', 5800000),
    (seed_owner, 'Resa', 'BTN', 10300000),
    (seed_owner, 'Resa', 'DANA', 410000),
    (seed_owner, 'Resa', 'GoPay', 225000),
    (seed_owner, 'Resa', 'SeaBank', 4200000),
    (seed_owner, 'Resa', 'Cash', 2100000)
  on conflict (user_id, owner, account) do nothing;

  insert into public.fixed_expenses (user_id, name, amount, due_date, category, status)
  select seed_owner, name, amount, due_date, category, status
  from (
    values
      ('Internet Rumah', 390000, 5, 'Utilitas', 'Aktif'),
      ('Listrik', 550000, 10, 'Utilitas', 'Aktif'),
      ('Air', 120000, 12, 'Utilitas', 'Aktif'),
      ('Sewa / KPR', 3500000, 1, 'Rumah', 'Aktif'),
      ('Asuransi', 750000, 15, 'Proteksi', 'Aktif'),
      ('Gym', 300000, 18, 'Lifestyle', 'Aktif'),
      ('Streaming', 99000, 20, 'Hiburan', 'Nonaktif'),
      ('Dana Orang Tua', 1000000, 25, 'Keluarga', 'Aktif'),
      ('Pulsa & Data', 220000, 7, 'Komunikasi', 'Aktif'),
      ('Tabungan Rutin', 1500000, 2, 'Tabungan', 'Aktif')
  ) as f(name, amount, due_date, category, status)
  where not exists (select 1 from public.fixed_expenses where user_id = seed_owner);

  insert into public.transactions (user_id, date, description, source, amount, type, category, recipient, created_at)
  select
    seed_owner,
    make_date(extract(year from now())::int, ((g - 1) % 12) + 1, ((g - 1) % 26) + 1),
    (array['Gaji bulanan','Belanja groceries','Makan siang','Top up investasi','Transport harian','Kopi sore','Bonus project','Bayar internet','Dana darurat','Dinner berdua','Belanja skincare','Cicilan tabungan'])[1 + ((g - 1) % 12)],
    (array['BCA','Tabungan BLU','Bank BCA','Cash','Bank Blu BCA','Tabungan Blu','Bank BCA Makan'])[1 + ((g - 1) % 7)],
    case
      when g % 9 = 0 then 4200000 + ((g % 5) * 750000)
      when g % 7 = 0 then 250000 + ((g % 6) * 150000)
      else 18000 + ((g % 15) * 27000)
    end,
    case
      when g % 9 = 0 then 'Masuk'
      when g % 7 = 0 then 'Investasi'
      else 'Pengeluaran'
    end,
    (array['Tabungan','Gaji','Living Expenses','Other','Bebi Personal','Makan / Minum'])[1 + ((g - 1) % 6)],
    (array['Bebi','Resa','Berdua'])[1 + ((g - 1) % 3)],
    now() - (g || ' hours')::interval
  from generate_series(1, 100) as g
  where not exists (select 1 from public.transactions where user_id = seed_owner);

  insert into public.wishlist (user_id, description, estimated_amount, target_date, status, created_at)
  select
    seed_owner,
    (array['Liburan Jepang','Upgrade Laptop Resa','Kamera Mirrorless','Dana Lahiran','Renovasi Dapur','Kursus Bahasa','Motor Listrik','Sofa Ruang Tamu','Kitchen Set','Emas Batangan','Staycation Anniversary','Sepeda Lipat','Meja Kerja','Air Purifier','Tiket Konser','Tabungan Umroh','Smart TV','Kulkas Baru','Asuransi Tambahan','Dana Emergency Plus'])[g],
    450000 + (g * 375000),
    make_date(extract(year from now())::int, ((g - 1) % 12) + 1, ((g - 1) % 24) + 3),
    case when g % 5 = 0 then 'Selesai' when g % 3 = 0 then 'Proses' else 'Belum' end,
    now() - (g || ' days')::interval
  from generate_series(1, 20) as g
  where not exists (select 1 from public.wishlist where user_id = seed_owner);

  insert into public.paylater (user_id, description, total_amount, tenor, last_payment_date, monthly_amount, payment_number, status, created_at)
  select
    seed_owner,
    (array['Cicilan Handphone','PayLater Marketplace','Kursi Kerja Ergonomis','Peralatan Dapur','Cicilan Kamera','Sepatu Running','Tablet Bebi','Home Appliance','Tiket Liburan','Kelas Online'])[g],
    900000 + (g * 420000),
    (array[3, 6, 12])[1 + ((g - 1) % 3)],
    make_date(extract(year from now())::int, ((g - 1) % 12) + 1, 25),
    ceil((900000 + (g * 420000)) / (array[3, 6, 12])[1 + ((g - 1) % 3)]),
    case when g % 4 = 0 then (array[3, 6, 12])[1 + ((g - 1) % 3)] else g % (array[3, 6, 12])[1 + ((g - 1) % 3)] end,
    case when g % 4 = 0 then 'Lunas' else 'Belum Lunas' end,
    now() - (g || ' days')::interval
  from generate_series(1, 10) as g
  where not exists (select 1 from public.paylater where user_id = seed_owner);

  insert into public.settings (user_id, key, value)
  values
    (seed_owner, 'currency', '{"locale":"id-ID","currency":"IDR"}'),
    (seed_owner, 'couple', '{"first":"Bebi","second":"Resa"}')
  on conflict (user_id, key) do nothing;
end $$;
