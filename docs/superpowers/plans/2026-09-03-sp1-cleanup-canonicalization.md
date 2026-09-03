# SP1 — Cleanup & Canonicalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both Bustan repos on `main`, free of iCloud duplicates, with one canonical home per asset (app → `bustan-energy`, static knowledge → `bustan-index`), mirrors retired into `_retired/` with a move log, TM-brand leftovers renamed, and the `/crm` redirect conflict resolved.

**Architecture:** Pure repo hygiene — no app logic changes except `vercel.json`. Moves use `git mv` and are logged to `_retired/_move-log.csv` (`from,to,reason,date`). Deletions are limited to iCloud `* 2.*`/`* 3.*` duplicates (approved by Kaniel 2026-09-03).

**Tech Stack:** git, bash, sed. Repos: `~/Desktop/projects/solar/bustan/bustan-energy` (E) and `~/Desktop/projects/solar/bustan/bustan-index` (I).

**Spec:** `docs/superpowers/specs/2026-09-03-bustan-final-grade-overhaul-design.md`

**Safety rules:**
- Never `rm` anything except files matching `* [23].*` (regex ` [23]\.`) outside `node_modules`/`.git`.
- Never touch `E/public/tools/` — it is served live at bustan-energy.com/tools/* (`vercel.json:64`).
- Never touch `E/tools/proposal-builder/` — canonical CLI.
- `I/proposals/tm-factory-001.*` are historical client deliverables — content stays, do NOT rename.

---

### Task 1: Merge feature branches into main (both repos)

**Files:** none (git only)

- [ ] **Step 1: Confirm fast-forward is possible**

Run in E and I:
```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy && git rev-list --left-right --count main...HEAD
cd ~/Desktop/projects/solar/bustan/bustan-index  && git rev-list --left-right --count main...HEAD
```
Expected: `0	3` in both (main 0 behind, branch 3 ahead). If the first number is not 0, STOP and report.

- [ ] **Step 2: Commit real untracked work in E**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy
git add .gitignore .mcp.json CLAUDE.md .claude docs/hiring
git status --short | grep -v ' [23]\.' | grep -v '^?? handoff/\|^?? out/'
```
Expected: only staged (`A`/`M`) lines remain. `handoff/` and `out/` stay untracked (large binaries) — add them to `.gitignore`:
```bash
printf '\n# local-only asset dumps\nhandoff/\nout/\n' >> .gitignore
git add .gitignore
git commit -m "chore: track CLAUDE.md, hiring docs, .claude; ignore handoff/ out/"
```

- [ ] **Step 3: Commit real untracked work in I**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-index
printf '\n# iCloud duplicates\n* [23].*\n**/* [23].*\n# scanner scratch\nroof-scanner/.new_buildings_progress.json\n' >> .gitignore
git add .gitignore .mcp.json CLAUDE.md .claude
git commit -m "chore: track CLAUDE.md/.claude; ignore iCloud dupes + scanner scratch"
```

- [ ] **Step 4: Fast-forward main in both repos**

```bash
for r in bustan-energy bustan-index; do
  cd ~/Desktop/projects/solar/bustan/$r
  b=$(git branch --show-current)
  git checkout main && git merge --ff-only "$b" && echo "$r: main = $(git rev-parse --short HEAD)"
done
```
Expected: two `main = <sha>` lines, no "fatal: Not possible to fast-forward".

- [ ] **Step 5: Push**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy && git push origin main
cd ~/Desktop/projects/solar/bustan/bustan-index  && git push origin main
```
Expected: both succeed. (If the network times out, retry once with `GIT_HTTP_LOW_SPEED_TIME=60`; if still failing, report and continue — pushes can be batched at Task 8.)

---

### Task 2: Delete iCloud duplicate files (both repos)

**Files:** delete every path matching ` [23].` (e.g. `foo 2.ts`, `img 3.webp`) outside `node_modules` and `.git`.

- [ ] **Step 1: Count and list**

```bash
for r in bustan-energy bustan-index; do
  cd ~/Desktop/projects/solar/bustan/$r
  find . \( -path ./node_modules -o -path ./.git -o -path '*/node_modules' \) -prune -o -type f -name '* [23].*' -print > /tmp/dupes-$r.txt
  echo "$r: $(wc -l < /tmp/dupes-$r.txt)"
done
```
Expected: E ≈ 1,700 (mostly `public/frames-smooth/**` webp), I ≈ 1–5.

- [ ] **Step 2: Sanity check that each dupe has an original**

```bash
for r in bustan-energy bustan-index; do
  cd ~/Desktop/projects/solar/bustan/$r
  while IFS= read -r f; do o=$(echo "$f" | sed -E 's/ [23](\.[^.]+)$/\1/'); [ -e "$o" ] || echo "NO ORIGINAL: $f"; done < /tmp/dupes-$r.txt
done | head -20
```
Expected: empty, or a short list. Any `NO ORIGINAL` file is NOT deleted — instead `git mv` it to `_retired/orphans/` (create dir) and log it in Task 3's CSV with reason `icloud-dupe-without-original`.

- [ ] **Step 3: Delete**

```bash
for r in bustan-energy bustan-index; do
  cd ~/Desktop/projects/solar/bustan/$r
  while IFS= read -r f; do o=$(echo "$f" | sed -E 's/ [23](\.[^.]+)$/\1/'); [ -e "$o" ] && rm -f "$f"; done < /tmp/dupes-$r.txt
  find . \( -path ./node_modules -o -path ./.git \) -prune -o -type f -name '* [23].*' -print | wc -l
done
```
Expected: `0` (or only the orphans moved in Step 2).

- [ ] **Step 4: Commit**

Tracked dupes were removed from the index by `rm`; stage deletions:
```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy && git add -A && git commit -m "chore: remove iCloud '* 2.*' duplicate files" || true
cd ~/Desktop/projects/solar/bustan/bustan-index  && git add -A && git commit -m "chore: remove iCloud '* 2.*' duplicate files" || true
```

---

### Task 3: Retire mirrors in bustan-energy → `_retired/`

**Files:**
- Create: `E/_retired/_move-log.csv`, `E/_retired/README.md`
- Move (git mv): `E/business/`, `E/marketing/`, `E/sales/`, `E/legacy/`, `E/tools/*.html`, `E/tools/{bill-scanner,crm-steps,drone,solar-atlas}/`
- Keep: `E/tools/proposal-builder/`, `E/pea-docs/` (has `INSTRUCTIONS.md`; verified by Step 1), `E/public/**`, `E/drone-imagery/` (has `cameras.json` used by scripts)

- [ ] **Step 1: Verify nothing in app code references the folders being retired**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy
grep -rn --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.json' --include='*.py' \
  -e '\bbusiness/' -e '\bmarketing/' -e '\bsales/' -e '\blegacy/' -e '"tools/' -e "'tools/" \
  src api scripts vite.config.ts vercel.json package.json tools/proposal-builder 2>/dev/null | grep -v node_modules | grep -v 'public/tools' | grep -v 'proposal-builder'
grep -rn 'pea-docs' src api scripts tools/proposal-builder 2>/dev/null | grep -v node_modules | head -3
```
Expected: first grep empty (no code references). If anything appears, exclude that specific path from the move and note it in the README. Second grep tells us if `pea-docs/` is used — it stays regardless.

- [ ] **Step 2: Create the retirement structure + log helper**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy
mkdir -p _retired
echo 'from,to,reason,date' > _retired/_move-log.csv
cat > _retired/README.md <<'MD'
# _retired/

Files moved here during SP1 (2026-09-03) because their canonical home is elsewhere.
Nothing here is served or imported. Safe to delete after Kaniel's review.

| Folder | Canonical location |
|---|---|
| business/, marketing/, sales/ | bustan-index root (index.bustan-energy.com) |
| tools/*.html, tools/{bill-scanner,crm-steps,drone,solar-atlas} | bustan-index root; live copies for the app are in `public/tools/` |
| legacy/ | superseded by KP Solar Pro (`bustan-index/kp-solar-pro.html`) |

See `_move-log.csv` for every path.
MD
mv_log() { # $1=from $2=to $3=reason
  mkdir -p "$(dirname "$2")"; git mv "$1" "$2" && echo "$1,$2,$3,2026-09-03" >> _retired/_move-log.csv
}
```

- [ ] **Step 3: Move business/marketing/sales/legacy**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy
for d in business marketing sales legacy; do
  [ -d "$d" ] && mv_log "$d" "_retired/$d" "mirror-of-bustan-index"
done
ls _retired
```
Expected: `README.md _move-log.csv business legacy marketing sales`.

- [ ] **Step 4: Move tools/*.html and tool sub-folders (not proposal-builder)**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy
for p in tools/*.html tools/bill-scanner tools/crm-steps tools/drone tools/solar-atlas; do
  [ -e "$p" ] && mv_log "$p" "_retired/$p" "static-tool-canonical-in-bustan-index"
done
ls tools
```
Expected: `proposal-builder` only.

- [ ] **Step 5: Build still passes**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy && npm run build 2>&1 | tail -5
```
Expected: `✓ built in …` with no errors. If the build fails on a missing path, restore that one path with `git mv` back and remove its CSV line.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore(SP1): retire business/marketing/sales/legacy/tools mirrors to _retired/ (logged)"
```

---

### Task 4: Retire dead scanner copies in bustan-index → `_retired/`

**Files:**
- Create: `I/_retired/_move-log.csv`, `I/_retired/README.md`
- Move: `I/archive/` → `I/_retired/archive/`; `I/platform/pro/{index.html,generate-proposal.html,grade-a-flight-plan.csv,supabase}` → `I/_retired/platform-pro/`
- Move docs to root: `I/platform/pro/PROCESS.md` → `I/SCAN_PROCESS.md`, `I/platform/pro/SCAN_REPORT.md` → `I/SCAN_REPORT.md`

- [ ] **Step 1: Verify no live page links into archive/ or platform/pro/**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-index
grep -rln --include='*.html' --include='*.js' --include='*.md' -e 'archive/' -e 'platform/pro/' . | grep -v '^./archive\|^./platform/pro\|node_modules\|_retired' | head
```
Expected: empty or only `.md` roadmap docs. For any `.html` hit, open it and change the link to `/kp-solar-pro.html` (the current tool) with `sed -i '' 's#platform/pro/index.html#kp-solar-pro.html#g; s#archive/roof-scanner.html#kp-solar-pro.html#g; s#archive/solar-atlas.html#kp-solar-pro.html#g' <file>`.

- [ ] **Step 2: Move**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-index
mkdir -p _retired/platform-pro
echo 'from,to,reason,date' > _retired/_move-log.csv
cat > _retired/README.md <<'MD'
# _retired/
Superseded scanner implementations (v1 roof-scanner, solar-atlas, KP Solar Pro 2.0 parallel build).
Current tool: `/kp-solar-pro.html`. Safe to delete after Kaniel's review. See `_move-log.csv`.
MD
mv_log() { mkdir -p "$(dirname "$2")"; git mv "$1" "$2" && echo "$1,$2,$3,2026-09-03" >> _retired/_move-log.csv; }
mv_log archive _retired/archive superseded-by-kp-solar-pro
for f in index.html generate-proposal.html grade-a-flight-plan.csv supabase; do
  [ -e "platform/pro/$f" ] && mv_log "platform/pro/$f" "_retired/platform-pro/$f" parallel-impl-superseded
done
mv_log platform/pro/PROCESS.md SCAN_PROCESS.md promoted-to-root-doc
mv_log platform/pro/SCAN_REPORT.md SCAN_REPORT.md promoted-to-root-doc
rmdir platform/pro 2>/dev/null; ls platform
```
Expected: `platform` now contains `PLATFORM_PLAN.md sales` only.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore(SP1): retire archive/ + platform/pro/ scanner copies; promote PROCESS/SCAN_REPORT docs to root"
```

---

### Task 5: Rebrand leftovers in bustan-index (TM Energy → Bustan Energy)

**Files:**
- Rename: `I/presentations/tm-energy-company-2026.html` → `I/presentations/bustan-energy-company-2026.html`
- Rename: `I/legal/nda-tm-energy-template.html` → `I/legal/nda-bustan-energy-template.html`; `I/legal/nda-tm-energy-erez-v2.html` → `I/legal/nda-bustan-energy-erez-v2.html`
- Modify: content of those 3 files + any file linking to the old names
- Untouched: `I/proposals/tm-factory-001.*`, `I/proposals/tm-logo.png` (historical)

- [ ] **Step 1: Count TM references before**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-index
grep -c -i 'tm energy\|tm-energy\|energy-tm' presentations/tm-energy-company-2026.html legal/nda-tm-energy-template.html legal/nda-tm-energy-erez-v2.html
```
Expected: three non-zero counts (record them).

- [ ] **Step 2: Rename files and rewrite content**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-index
git mv presentations/tm-energy-company-2026.html presentations/bustan-energy-company-2026.html
git mv legal/nda-tm-energy-template.html legal/nda-bustan-energy-template.html
git mv legal/nda-tm-energy-erez-v2.html legal/nda-bustan-energy-erez-v2.html
for f in presentations/bustan-energy-company-2026.html legal/nda-bustan-energy-template.html legal/nda-bustan-energy-erez-v2.html; do
  sed -i '' -e 's/TM Energy/Bustan Energy/g' -e 's/TM ENERGY/BUSTAN ENERGY/g' -e 's/tm-energy/bustan-energy/g' -e 's/energy-tm\.com/bustan-energy.com/g' -e 's/TM אנרגיה/בוסתן אנרגיה/g' "$f"
done
grep -c -i 'tm energy\|tm-energy\|energy-tm' presentations/bustan-energy-company-2026.html legal/nda-bustan-energy-*.html
```
Expected: `0` for all three. If a count is non-zero, `grep -n -i 'tm energy\|tm-energy\|energy-tm' <file>` and fix by hand (it will be a variant spelling like "T.M. Energy").

- [ ] **Step 3: Fix inbound links to the renamed files**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-index
grep -rl 'tm-energy-company-2026\|nda-tm-energy' --include='*.html' --include='*.md' --include='*.js' . | grep -v node_modules | grep -v _retired \
 | xargs -I{} sed -i '' -e 's/tm-energy-company-2026/bustan-energy-company-2026/g' -e 's/nda-tm-energy/nda-bustan-energy/g' {}
grep -rn 'tm-energy-company-2026\|nda-tm-energy' --include='*.html' --include='*.md' . | grep -v node_modules | grep -v _retired | wc -l
```
Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore(SP1): rebrand remaining TM Energy deck + NDA files to Bustan Energy"
```

---

### Task 6: Resolve `/crm` redirect conflict in bustan-energy

**Files:**
- Modify: `E/vercel.json:56-57` (remove two redirect objects). Keep the `/crm/:path*` headers block at `vercel.json:19-25`.

Decision (spec): `/crm` stays live (routes exist in `src/App.tsx:113,153`); the permanent redirect to `/platform` is removed.

- [ ] **Step 1: Remove the two redirects**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy
node -e '
const fs=require("fs");const v=JSON.parse(fs.readFileSync("vercel.json","utf8"));
const before=v.redirects.length;
v.redirects=v.redirects.filter(r=>!(r.source==="/crm"||r.source==="/crm/:path*"));
fs.writeFileSync("vercel.json",JSON.stringify(v,null,2)+"\n");
console.log("redirects",before,"->",v.redirects.length);'
grep -n '"/crm' vercel.json
```
Expected: `redirects N -> N-2`; grep shows only the headers entry (line ~20), no `destination: "/platform"` lines.

- [ ] **Step 2: Validate JSON + build**

```bash
node -e 'JSON.parse(require("fs").readFileSync("vercel.json","utf8"))' && npm run build 2>&1 | tail -2
```
Expected: no parse error; `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add vercel.json && git commit -m "fix(SP1): drop /crm→/platform redirects; /crm routes are live in App.tsx"
```

---

### Task 7: Orphan SQL files in bustan-index

**Files:**
- `I/supabase/leads-migration.sql`, `I/supabase/proposal_events.sql`
- Compare against: `E/supabase/migrations/*.sql` (main DB `trvgpgp`) and `E/supabase/bustan-migrations/*.sql`

- [ ] **Step 1: Check whether each orphan's objects already exist in a tracked migration**

```bash
cd ~/Desktop/projects/solar/bustan
for f in bustan-index/supabase/leads-migration.sql bustan-index/supabase/proposal_events.sql; do
  echo "== $f"
  grep -oiE 'create (table|view|function|index)( if not exists)? [a-z_.]+' "$f" | awk '{print $NF}' | sort -u | while read obj; do
    n=$(grep -rli "$obj" bustan-energy/supabase/migrations bustan-energy/supabase/bustan-migrations | wc -l | tr -d ' ')
    echo "  $obj -> found in $n tracked migration(s)"
  done
done
```

- [ ] **Step 2: Act on the result**

- Every object found in ≥1 tracked migration → the orphan is redundant: `git rm` it.
- Any object found in 0 → move the file into `E/supabase/unapplied/` (create dir) and add one line to `E/supabase/unapplied/README.md`: `<file>: objects <list> — origin bustan-index/supabase, needs DB check before apply`.

```bash
cd ~/Desktop/projects/solar/bustan/bustan-index
# example for the redundant case:
git rm supabase/leads-migration.sql
# example for the unapplied case:
mkdir -p ../bustan-energy/supabase/unapplied && git mv supabase/proposal_events.sql ../bustan-energy/supabase/unapplied/ 2>/dev/null || { cp supabase/proposal_events.sql ../bustan-energy/supabase/unapplied/ && git rm supabase/proposal_events.sql; }
rmdir supabase 2>/dev/null; true
```
(Use whichever branch applies per file — report which one you took.)

- [ ] **Step 3: Commit both repos**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-index  && git add -A && git commit -m "chore(SP1): remove/relocate orphan SQL outside migration trees" || true
cd ~/Desktop/projects/solar/bustan/bustan-energy && git add -A && git commit -m "chore(SP1): park unapplied SQL from bustan-index for DB check" || true
```

---

### Task 8: Push, deploy-verify, report

- [ ] **Step 1: Push both mains**

```bash
cd ~/Desktop/projects/solar/bustan/bustan-energy && git push origin main
cd ~/Desktop/projects/solar/bustan/bustan-index  && git push origin main
```

- [ ] **Step 2: Wait for deploys and smoke-check live URLs**

```bash
sleep 180
for u in https://bustan-energy.com/ https://bustan-energy.com/admin https://bustan-energy.com/crm https://bustan-energy.com/tools/drone/gcp-marker.html https://index.bustan-energy.com/ https://index.bustan-energy.com/kp-solar-pro.html https://index.bustan-energy.com/presentations/bustan-energy-company-2026.html https://index.bustan-energy.com/academy/; do
  printf '%s  ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' -L "$u"
done
```
Expected: all `200`. `/crm` must be 200 (not 308→/platform). If `/crm` still redirects, the Vercel deploy may not have finished — re-run after 2 more minutes.

- [ ] **Step 3: Report**

Write a 10-line summary: commits per repo, files deleted (count), files moved (count), orphan SQL decision, any path restored in Task 3 Step 5, live-URL results.
