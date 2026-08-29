# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

# better-sqlite3 may need native compilation during npm install
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY Discord-Bot/package.json Discord-Bot/package-lock.json ./
RUN npm ci --omit=dev


FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules

# Copy bot source
COPY Discord-Bot/ ./

CMD ["node", "index.js"]