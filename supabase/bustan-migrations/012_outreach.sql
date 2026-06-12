-- ============================================================
-- 012_outreach.sql — outreach & content tables (marketing layer Phase 1)
-- Run AFTER 011_existing_solar_check.sql.
-- Spec: docs/superpowers/specs/2026-06-12-marketing-outreach-layer-design.md
-- ============================================================

create table if not exists bustan.outreach_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  segment     jsonb not null default '{}'::jsonb,
  channel     text not null check (channel in ('line','whatsapp','email')),
  language    text not null check (language in ('th','en')),
  prompt      text not null,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

create table if not exists bustan.outreach_messages (
  id           uuid primary key default gen_random_uuid(),
  property_id  text not null references bustan.properties(id) on delete cascade,  -- text: matches bustan.properties.id (not uuid)
  template_id  uuid references bustan.outreach_templates(id),
  channel      text not null check (channel in ('line','whatsapp','email')),
  language     text not null check (language in ('th','en')),
  recipient    text,            -- email address or phone, snapshotted at generation
  subject      text,            -- email only
  body         text not null,
  facts        jsonb not null default '{}'::jsonb,  -- computed numbers (audit trail)
  status       text not null default 'draft'
               check (status in ('draft','approved','sent','delivered','replied','bounced','skipped')),
  approved_by  text,
  approved_at  timestamptz,
  sent_at      timestamptz,
  replied_at   timestamptz,
  thread_ref   text,            -- Resend id / LINE userId / WhatsApp chat id
  error        text,
  created_at   timestamptz default now()
);

create index if not exists idx_outreach_messages_status
  on bustan.outreach_messages(status);
create index if not exists idx_outreach_messages_property
  on bustan.outreach_messages(property_id);
create index if not exists idx_outreach_messages_template
  on bustan.outreach_messages(template_id);
-- one live conversation per property+channel (skipped/bounced may be retried)
create unique index if not exists idx_outreach_one_per_property_channel
  on bustan.outreach_messages(property_id, channel)
  where status not in ('skipped','bounced');

create table if not exists bustan.content_posts (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null check (platform in ('fb','ig','line_broadcast')),
  language      text not null default 'th',
  format        text not null check (format in ('roof_of_week','area_stats','field_photo','pea_education')),
  body          text not null,
  media_url     text,
  source_facts  jsonb default '{}'::jsonb,
  status        text not null default 'draft'
                check (status in ('draft','approved','published','failed')),
  scheduled_at  timestamptz,
  published_at  timestamptz,
  published_ref text,
  approved_by   text,
  created_at    timestamptz default now()
);

-- ── RLS (pattern from migrations/018: service role all, authenticated read) ──
alter table bustan.outreach_templates enable row level security;
alter table bustan.outreach_messages  enable row level security;
alter table bustan.content_posts      enable row level security;

drop policy if exists "service_role_all_outreach_templates" on bustan.outreach_templates;
create policy "service_role_all_outreach_templates" on bustan.outreach_templates
  for all using (auth.role() = 'service_role');
drop policy if exists "admin_read_outreach_templates" on bustan.outreach_templates;
create policy "admin_read_outreach_templates" on bustan.outreach_templates
  for select using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_outreach_messages" on bustan.outreach_messages;
create policy "service_role_all_outreach_messages" on bustan.outreach_messages
  for all using (auth.role() = 'service_role');
drop policy if exists "admin_read_outreach_messages" on bustan.outreach_messages;
create policy "admin_read_outreach_messages" on bustan.outreach_messages
  for select using (auth.role() = 'authenticated');

drop policy if exists "service_role_all_content_posts" on bustan.content_posts;
create policy "service_role_all_content_posts" on bustan.content_posts
  for all using (auth.role() = 'service_role');
drop policy if exists "admin_read_content_posts" on bustan.content_posts;
create policy "admin_read_content_posts" on bustan.content_posts
  for select using (auth.role() = 'authenticated');

-- ── Seed templates ──
insert into bustan.outreach_templates (key, channel, language, prompt) values
(
  'b2b_email_th', 'email', 'th',
  'You are a polite Thai B2B copywriter for Bustan Energy, a solar EPC company in Thailand.
Write a short first-contact email in THAI to {contact_name} at {company_name} in {district}.
Facts you MUST use verbatim (do not change any number):
- Our satellite scan found their roof has about {roof_sqm} sqm of usable space.
- That fits a ~{kwp} kWp solar system.
- Estimated saving: ฿{monthly_saving_thb} per month on PEA electricity costs.
Structure: greeting with wai (สวัสดีครับ), 2 short paragraphs, one clear CTA offering a free
detailed assessment, sign off as "ทีม Bustan Energy". Max 120 words of Thai.
Include this exact opt-out line at the end: "หากไม่สนใจ ขออภัยในความไม่สะดวก แจ้งเราได้เลยครับ"
Output format EXACTLY:
SUBJECT: <thai subject line, max 8 words>

<email body, plain text>'
),
(
  'b2b_email_en', 'email', 'en',
  'You are a B2B copywriter for Bustan Energy, a solar EPC company in Thailand.
Write a short first-contact email in ENGLISH to {contact_name} at {company_name} in {district}.
Facts you MUST use verbatim (do not change any number):
- Our satellite scan found their roof has about {roof_sqm} sqm of usable space.
- That fits a ~{kwp} kWp solar system.
- Estimated saving: ฿{monthly_saving_thb} per month on PEA electricity costs.
Structure: professional greeting, 2 short paragraphs, one clear CTA offering a free
detailed assessment, sign off as "The Bustan Energy Team". Max 120 words.
Include a final opt-out sentence: "If this isn''t relevant, just reply and we won''t contact you again."
Output format EXACTLY:
SUBJECT: <subject line, max 8 words>

<email body, plain text>'
)
on conflict (key) do nothing;
