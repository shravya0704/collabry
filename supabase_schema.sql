
-- 1. User profiles (extra info, linked to Supabase Auth, with block status)
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  username text unique,
  bio text,
  is_blocked boolean default false
);

-- 2. Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 3. Subcategories
create table if not exists subcategories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  category_id uuid references categories(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 4. Posts (forum posts, mapped to categories/subcategories)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  author_id uuid references auth.users,
  category_id uuid references categories(id),
  subcategory_id uuid references subcategories(id),
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc', now())
);

-- 5. Forum threads
create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  author_id uuid references auth.users,
  tags text[],
  created_at timestamp with time zone default timezone('utc', now())
);

-- 6. Comments on threads
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references threads(id) on delete cascade,
  author_id uuid references auth.users,
  text text not null,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 7. Project collaborations
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid references auth.users,
  tags text[],
  created_at timestamp with time zone default timezone('utc', now())
);

-- 8. Applications to projects
create table if not exists project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  applicant_id uuid references auth.users,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc', now())
);
