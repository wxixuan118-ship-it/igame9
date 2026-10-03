# igame9 on AnySites: game directory app (apps/web) + static game pages (static/).
FROM node:24-slim
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Copies the static game pages into apps/web/public, then builds the web app.
# SKIP_ENV_VALIDATION: runtime secrets are not available (or needed) while building.
RUN SKIP_ENV_VALIDATION=1 pnpm build:prod
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# Applies pending migrations, upserts the static pages into the game table, starts the server.
CMD ["pnpm", "start"]
