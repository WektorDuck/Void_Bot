# syntax=docker/dockerfile:1

FROM node22-bookworm-slim AS dependencies

WORKDIR app

# better-sqlite3 may need native compilation during npm install
RUN apt-get update 
    && apt-get install -y --no-install-recommends python3 make g++ 
    && rm -rf varlibaptlists

COPY Discord-Botpackage.json Discord-Botpackage-lock.json .
RUN npm ci --omit=dev


FROM node22-bookworm-slim AS runtime

WORKDIR app

ENV NODE_ENV=production

COPY --from=dependencies appnode_modules .node_modules

# Copy only application source. Secrets (.env  Google service-account JSON)
# should be supplied at runtime, not baked into the image.
COPY Discord-Bot.js .

CMD [node, index.js]
