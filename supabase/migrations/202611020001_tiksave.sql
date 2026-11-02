begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  created_at timestamptz not null default now()
);
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  tiktok_video_id text check (tiktok_video_id ~ '^[0-9]{15,25}$'),
  title text not null check (char_length(title) between 1 and 200),
  creator_name text check (char_length(creator_name) <= 100),
  thumbnail_url text,
  is_public boolean not null default false,
  upload_state text not null default 'pending' check (upload_state in ('pending','ready','deleting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id), unique (owner_id, tiktok_video_id)
);
create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  mime_type text not null default 'video/mp4' check (mime_type = 'video/mp4'),
  file_size bigint not null check (file_size between 16 and 26214400),
  width integer check (width > 0), height integer check (height > 0),
  authorization_status text not null default 'pending' check (authorization_status in ('pending','authorized','revoked')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (video_id, owner_id) references public.videos(id, owner_id) on delete cascade,
  check (storage_path = owner_id::text || '/' || video_id::text || '/original.mp4'),
  unique(video_id)
);
create table public.upload_intents (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null unique,
  owner_id uuid not null,
  storage_path text not null unique,
  expected_size bigint not null check (expected_size between 16 and 26214400),
  share_download boolean not null default false,
  rights_attested_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  created_at timestamptz not null default now(),
  foreign key (video_id, owner_id) references public.videos(id, owner_id) on delete cascade,
  check (storage_path = owner_id::text || '/' || video_id::text || '/original.mp4')
);
create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references public.videos(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'link_issued' check (status = 'link_issued'),
  created_at timestamptz not null default now()
);
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  requests integer not null default 1
);
create index videos_tiktok_idx on public.videos(tiktok_video_id) where upload_state = 'ready';
create index videos_owner_idx on public.videos(owner_id, created_at desc);
create index video_assets_owner_idx on public.video_assets(owner_id);
create index downloads_user_idx on public.downloads(user_id, created_at desc);
create index upload_intents_expiry_idx on public.upload_intents(expires_at);

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.video_assets enable row level security;
alter table public.upload_intents enable row level security;
alter table public.downloads enable row level security;
alter table public.rate_limits enable row level security;
create policy profiles_own_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_own_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy videos_permitted_read on public.videos for select to anon, authenticated using (
  owner_id = (select auth.uid()) or (is_public and upload_state = 'ready')
);
create policy assets_permitted_read on public.video_assets for select to anon, authenticated using (
  exists (select 1 from public.videos v where v.id = video_id and v.upload_state = 'ready'
    and (video_assets.owner_id = (select auth.uid()) or (v.is_public and video_assets.is_public and authorization_status = 'authorized')))
);
create policy intents_own_read on public.upload_intents for select to authenticated using (owner_id = (select auth.uid()));
create policy downloads_own_read on public.downloads for select to authenticated using (user_id = (select auth.uid()));
-- Only server-verified API operations may mutate video/asset/intent/history records.
revoke all on public.videos, public.video_assets, public.upload_intents, public.downloads, public.rate_limits from anon, authenticated;
grant select on public.videos, public.video_assets to anon, authenticated;
grant select on public.upload_intents, public.downloads, public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant all on public.profiles, public.videos, public.video_assets, public.upload_intents, public.downloads, public.rate_limits to service_role;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name','Creator'),100));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;

create function public.consume_rate_limit(bucket_key text, max_requests integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  if max_requests < 1 or max_requests > 120 or char_length(bucket_key) <> 64 then raise exception 'invalid limit'; end if;
  insert into public.rate_limits(key) values (bucket_key)
  on conflict (key) do update set
    requests = case when public.rate_limits.window_start < now() - interval '1 minute' then 1 else public.rate_limits.requests + 1 end,
    window_start = case when public.rate_limits.window_start < now() - interval '1 minute' then now() else public.rate_limits.window_start end
  returning requests into total;
  return total <= max_requests;
end;
$$;

create function public.initialize_upload(p_owner uuid, p_title text, p_tiktok_id text, p_size bigint, p_public_metadata boolean, p_share_download boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid(); i_id uuid := gen_random_uuid(); v_path text;
begin
  -- Serialize each owner's reservations, including pending uploads, to enforce quota.
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));
  if (select count(*) from public.videos where owner_id = p_owner) >= 20
    or coalesce((select count(*) * 26214400 from public.upload_intents where owner_id = p_owner),0)
      + coalesce((select sum(file_size) from public.video_assets where owner_id = p_owner),0) + 26214400 > 209715200
  then raise exception 'creator_quota_exceeded'; end if;
  v_path := p_owner::text || '/' || v_id::text || '/original.mp4';
  insert into public.videos(id, owner_id, title, tiktok_video_id, is_public)
    values(v_id, p_owner, p_title, p_tiktok_id, p_public_metadata or p_share_download);
  insert into public.upload_intents(id, video_id, owner_id, storage_path, expected_size, share_download)
    values(i_id, v_id, p_owner, v_path, p_size, p_share_download);
  return jsonb_build_object('id',i_id,'video_id',v_id,'storage_path',v_path);
end;
$$;

create function public.finalize_upload(p_intent uuid, p_owner uuid, p_size bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare item public.upload_intents; asset_id uuid;
begin
  select * into item from public.upload_intents where id = p_intent and owner_id = p_owner for update;
  if not found or item.expires_at < now() or item.expected_size <> p_size then raise exception 'invalid_upload'; end if;
  insert into public.video_assets(video_id, owner_id, storage_path, file_size, authorization_status, is_public)
    values(item.video_id,item.owner_id,item.storage_path,p_size,'authorized',item.share_download) returning id into asset_id;
  update public.videos set upload_state = 'ready', updated_at = now() where id = item.video_id and upload_state = 'pending';
  if not found then raise exception 'invalid_upload_state'; end if;
  delete from public.upload_intents where id = item.id;
  return asset_id;
end;
$$;
revoke all on function public.consume_rate_limit(text,integer), public.initialize_upload(uuid,text,text,bigint,boolean,boolean), public.finalize_upload(uuid,uuid,bigint) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,integer), public.initialize_upload(uuid,text,text,bigint,boolean,boolean), public.finalize_upload(uuid,uuid,bigint) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('originals','originals',false,26214400,array['video/mp4'])
on conflict(id) do update set public=false,file_size_limit=26214400,allowed_mime_types=array['video/mp4'];
-- No storage.objects policies: raw reads/writes are denied. Server-issued, path-scoped
-- signed uploads and downloads are the only object access mechanism.
commit;
