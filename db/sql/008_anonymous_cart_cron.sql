-- 008_anonymous_cart_cron.sql
-- Scheduled cleanup for expired anonymous cart rows.
-- Requires pg_cron extension enabled in your Supabase project.

begin;

create extension if not exists pg_cron;

-- Remove prior job if it exists (idempotent reruns)
do $$
declare
  v_job_id integer;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'cleanup_expired_anonymous_cart';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end;
$$;

-- Run every 30 minutes
select cron.schedule(
  'cleanup_expired_anonymous_cart',
  '*/30 * * * *',
  $$
  delete from public.anonymous_cart_items
  where expires_at < now();
  $$
);

commit;
