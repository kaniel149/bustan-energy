FROM node:20-slim

# Install Chromium dependencies for Crawlee's Cheerio mode.
# If you switch to PlaywrightCrawler, add: RUN npx playwright install --with-deps chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.mjs ./

# Cloud Run injects PORT automatically; default matches the server default (8080).
ENV PORT=8080

EXPOSE 8080

CMD ["node", "index.mjs"]
