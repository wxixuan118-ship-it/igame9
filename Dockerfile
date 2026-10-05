# One image, two AnySites services chosen by the SERVICE env var:
#   (unset) / games  -> igame9.ai games site: static/ pages; proxies /directory/* to DIRECTORY_ORIGIN
#   directory        -> game directory app (apps/web) served under /directory, uses DATABASE_URL
FROM node:24-slim
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Builds both: the directory app (with the games site's assets synced in) and static/dist.
# SKIP_ENV_VALIDATION: runtime secrets are not available (or needed) while building.
RUN SKIP_ENV_VALIDATION=1 pnpm build:prod
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]
