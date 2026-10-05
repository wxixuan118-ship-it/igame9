# One image for both AnySites Node.js projects; the SERVICE env var picks what runs:
#   (unset)     games site entry (bind igame9.ai): serve.mjs serves dist/ and proxies
#               /directory/* to DIRECTORY_ORIGIN
#   directory   game directory app (directory/), served under /directory, uses DATABASE_URL
# The original STATIC project ignores this file and runs `npm run build` at the repo root.
FROM node:24-slim
WORKDIR /app
RUN corepack enable
COPY . .
# Games site: zero-dependency static build into /app/dist.
RUN node build.mjs
# Directory app. SKIP_ENV_VALIDATION: runtime secrets are not available (or needed) while building.
WORKDIR /app/directory
RUN pnpm install --frozen-lockfile && SKIP_ENV_VALIDATION=1 pnpm build:prod
WORKDIR /app
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "if [ \"$SERVICE\" = directory ]; then cd directory && exec pnpm start; else exec node serve.mjs; fi"]
