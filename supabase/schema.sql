-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

-- Tracks each user's free-usage and pro status.
create table if not exists public.usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_used boolean not null default false,
  is_pro boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- Automatically create a usage row when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.usage (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: a user can read only their own row.
-- (All writes happen server-side with the service role key, which bypasses RLS.)
alter table public.usage enable row level security;

drop policy if exists "read own usage" on public.usage;
create policy "read own usage" on public.usage
  for select using (auth.uid() = user_id);
