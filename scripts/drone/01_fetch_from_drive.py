#!/usr/bin/env python3
"""
01 — Fetch drone photos from Google Drive (recursive).

Usage:
  python3 01_fetch_from_drive.py [FOLDER_ID] [ACCOUNT]
  python3 01_fetch_from_drive.py 1c0IqckTVC9epmlCx6X6FOt1p2kuB5x85 kaniel

Downloads images to: drone-imagery/raw/<folder_name>/<subdir>/<filename>
Writes index JSON:   drone-imagery/raw/<folder_name>.index.json
"""
import os, sys, io, json
from pathlib import Path
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

CREDS_DIR = "/Users/kanieltordjman/Desktop/projects/integrations/email-scanner"
ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "drone-imagery" / "raw"

def svc(account):
    p = f"{CREDS_DIR}/token-{account}.json"
    c = Credentials.from_authorized_user_file(p)
    if c.expired and c.refresh_token:
        c.refresh(Request())
        open(p, 'w').write(c.to_json())
    return build('drive', 'v3', credentials=c)

def find_owner(folder_id, preferred=None):
    accounts = ["kaniel", "k", "kaniel-tm", "gmail"]
    if preferred and preferred in accounts:
        accounts = [preferred] + [a for a in accounts if a != preferred]
    for a in accounts:
        try:
            s = svc(a)
            meta = s.files().get(fileId=folder_id, fields="id,name,mimeType",
                                 supportsAllDrives=True).execute()
            print(f"[OK] account '{a}' sees: {meta.get('name')}")
            return a, s, meta
        except Exception as e:
            print(f"[--] {a}: {str(e)[:60]}")
    return None, None, None

def list_folder(s, fid):
    out, tok = [], None
    while True:
        r = s.files().list(
            q=f"'{fid}' in parents and trashed=false",
            fields="nextPageToken, files(id,name,mimeType,size)",
            pageSize=1000, pageToken=tok,
            includeItemsFromAllDrives=True, supportsAllDrives=True
        ).execute()
        out.extend(r.get('files', []))
        tok = r.get('nextPageToken')
        if not tok: break
    return out

def download_file(s, fid, dst):
    if dst.exists() and dst.stat().st_size > 0:
        return "skip"
    req = s.files().get_media(fileId=fid, supportsAllDrives=True)
    buf = io.FileIO(str(dst), "wb")
    try:
        dl = MediaIoBaseDownload(buf, req, chunksize=10 * 1024 * 1024)
        done = False
        while not done:
            _, done = dl.next_chunk()
    finally:
        buf.close()
    return "new"

def walk(s, fid, name, out_dir, log):
    items = list_folder(s, fid)
    imgs = [i for i in items if i['mimeType'].startswith('image/')]
    subs = [i for i in items if 'folder' in i['mimeType']]
    if imgs:
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n📁 {name} → {len(imgs)} images")
        for i, f in enumerate(imgs, 1):
            dst = out_dir / f['name']
            try:
                status = download_file(s, f['id'], dst)
                log.append({"id": f['id'], "name": f['name'],
                            "size": int(f.get('size', 0)), "folder": name,
                            "local": str(dst.relative_to(ROOT)), "status": status})
                print(f"  [{i:3}/{len(imgs)}] {f['name']} ({status})", end='\r')
            except Exception as e:
                print(f"  [ERR] {f['name']}: {str(e)[:60]}")
        print()
    for sub in subs:
        walk(s, sub['id'], f"{name}/{sub['name']}", out_dir / sub['name'], log)

if __name__ == "__main__":
    fid = sys.argv[1] if len(sys.argv) > 1 else "1c0IqckTVC9epmlCx6X6FOt1p2kuB5x85"
    pref = sys.argv[2] if len(sys.argv) > 2 else None
    acc, s, meta = find_owner(fid, pref)
    if not s:
        sys.exit("FAIL: folder not accessible by any account")
    root_name = meta['name'].replace('/', '_').strip()
    root_out = RAW_DIR / root_name
    log = []
    walk(s, fid, root_name, root_out, log)
    idx = RAW_DIR / f"{root_name}.index.json"
    idx.parent.mkdir(parents=True, exist_ok=True)
    idx.write_text(json.dumps({"folder_id": fid, "folder_name": root_name,
                                "account": acc, "count": len(log),
                                "total_bytes": sum(x['size'] for x in log),
                                "files": log}, indent=2, ensure_ascii=False))
    print(f"\n✅ downloaded {len(log)} files → {root_out}")
    print(f"📋 index → {idx}")
