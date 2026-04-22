-- =====================================================
-- 010_signatures.sql
-- Digital contract signatures table
-- =====================================================

create table if not exists public.proposal_signatures (
  id uuid primary key default gen_random_uuid(),
  proposal_ref text not null,

  -- Signer info
  signer_name text not null,
  signer_id text,
  signer_email text,
  signer_phone text,

  -- Signature data
  signature_base64 text not null,
  signature_method text default 'canvas',

  -- Legal metadata
  signed_at timestamptz default now(),
  ip inet,
  user_agent text,
  country text,
  signed_location text,
  terms_version text default '1.0',

  -- Document
  signed_pdf_path text,
  hash_sha256 text,

  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_signatures_ref on public.proposal_signatures(proposal_ref);
create index if not exists idx_signatures_date on public.proposal_signatures(signed_at desc);

-- ── TRIGGER: mark proposal as signed/accepted ──
create or replace function mark_proposal_accepted()
returns trigger as $$
begin
  update public.proposals
  set
    status = 'signed',
    signed_at = NEW.signed_at,
    signature_data = jsonb_build_object(
      'signer_name', NEW.signer_name,
      'signer_id', NEW.signer_id,
      'signed_at', NEW.signed_at,
      'hash', NEW.hash_sha256
    )
  where ref_number = NEW.proposal_ref and status != 'signed';
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_mark_accepted on public.proposal_signatures;
create trigger trg_mark_accepted
  after insert on public.proposal_signatures
  for each row execute function mark_proposal_accepted();

-- ── RLS ──
alter table public.proposal_signatures enable row level security;

drop policy if exists "service_role_all_sigs" on public.proposal_signatures;
create policy "service_role_all_sigs" on public.proposal_signatures
  for all using (auth.role() = 'service_role');

drop policy if exists "admin_read_sigs" on public.proposal_signatures;
create policy "admin_read_sigs" on public.proposal_signatures
  for select using (auth.role() = 'authenticated');

comment on table public.proposal_signatures is 'Digital contract signatures with audit trail';
