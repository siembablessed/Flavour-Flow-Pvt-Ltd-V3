-- 013_admin_access_control.sql
-- Introduces role-based admin access control and audit logging.

begin;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'support_viewer',
  permissions text[] not null default '{}'::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.admin_users
set email = lower(trim(email));

create unique index if not exists idx_admin_users_email_lower on public.admin_users ((lower(email)));

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  actor_email text null,
  action text not null,
  resource_type text not null,
  resource_id text null,
  details jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created_at on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_actor_id on public.admin_audit_log (actor_id);
create index if not exists idx_admin_audit_log_action on public.admin_audit_log (action);

alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;

commit;
