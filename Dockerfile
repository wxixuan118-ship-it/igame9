# Build for the AnySites *directory* project (Node.js): the game directory app in directory/,
# served at igame9.ai/directory via the games site's proxy.
# The games project (STATIC) ignores this file: it runs `npm install && npm start` at the repo root.
FROM node:24-slim
WORKDIR /app
RUN corepack enable
COPY . .
WORKDIR /app/directory
RUN pnpm install --frozen-lockfile
# Copies the games site's CSS/thumbnails into apps/web/public, then builds the web app.
# SKIP_ENV_VALIDATION: runtime secrets are not available (or needed) while building.
RUN SKIP_ENV_VALIDATION=1 pnpm build:prod
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# Applies pending migrations, upserts our games into the game table, starts the server.
CMD ["pnpm", "start"]
