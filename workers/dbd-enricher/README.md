# dbd-enricher

Crawlee batch worker that polls the Bustan `owner_decision` table for pending rows,
scrapes Thailand DBD juristic records, and writes company name / address / phone /
website back.

**JURISTIC ONLY.** Do not use this for individual / natural-person owners.
See `docs/SCRAPING.md` section 5 for the PDPA B.E.2562 rationale.

**This is a standalone scaffold.** It has its own `package.json` and is NOT
referenced by the root `tsconfig` or Vite build. Deploy and test it independently.

---

## Local setup

```bash
cd workers/dbd-enricher
npm install

export BUSTAN_SUPABASE_URL="https://<project-ref>.supabase.co"
export BUSTAN_SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
# Optional:
export BATCH_SIZE=5
export CRAWL_DELAY_MS=2000
export PORT=8080

npm start
# Then in another terminal:
curl -X POST http://localhost:8080/run
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BUSTAN_SUPABASE_URL` | yes | — | Bustan Supabase project URL |
| `BUSTAN_SUPABASE_SERVICE_ROLE_KEY` | yes | — | Service-role key (keep secret) |
| `BATCH_SIZE` | no | 20 | Rows per run |
| `CRAWL_DELAY_MS` | no | 1500 | Delay between Crawlee requests (ms) |
| `PORT` | no | 8080 | HTTP listener port |

## Cloud Run deploy

```bash
# 1. Build and push the container image
PROJECT_ID=<your-gcp-project-id>
IMAGE=gcr.io/$PROJECT_ID/dbd-enricher

docker build -t $IMAGE workers/dbd-enricher/
docker push $IMAGE

# 2. Deploy to Cloud Run (min 0 instances — only billed when running)
gcloud run deploy dbd-enricher \
  --image $IMAGE \
  --region asia-southeast1 \
  --platform managed \
  --no-allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --timeout 300 \
  --set-env-vars "BUSTAN_SUPABASE_URL=<url>,BATCH_SIZE=20,CRAWL_DELAY_MS=1500" \
  --set-secrets "BUSTAN_SUPABASE_SERVICE_ROLE_KEY=bustan-service-role-key:latest"

# 3. Create a Cloud Scheduler job that POSTs /run every 10 minutes
SERVICE_URL=$(gcloud run services describe dbd-enricher \
  --region asia-southeast1 --format 'value(status.url)')

gcloud scheduler jobs create http dbd-enricher-trigger \
  --schedule "*/10 * * * *" \
  --uri "$SERVICE_URL/run" \
  --http-method POST \
  --oidc-service-account-email <your-sa>@<project>.iam.gserviceaccount.com \
  --location asia-southeast1
```

> Cloud Run with `--no-allow-unauthenticated` requires the Cloud Scheduler service
> account to have the `roles/run.invoker` IAM role on the service.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/run` | Trigger a batch (returns JSON summary) |
| `GET` | `/health` | Liveness check for Cloud Run health probes |

## Customising the DBD scraper

The selector logic in `index.mjs` targets `data.creden.co` (a public Thai company
search portal that aggregates DBD data). If the page layout changes:

1. Open `https://data.creden.co/search?q=<company>` in a browser and inspect the DOM.
2. Update the CSS selectors in the `requestHandler` block inside `scrapeDbdRecord()`.
3. As a fallback, consider swapping `CheerioCrawler` for `PlaywrightCrawler` (add
   `@crawlee/playwright` + `playwright` to package.json) for JS-rendered pages.

For a layout-agnostic alternative, see `docs/SCRAPING.md` §1 (ScrapeGraphAI — OPTIONAL).
