# Minimal image for the billing server in this pnpm monorepo.
#
# Installs ONLY @interview-copilot/server + its workspace dependency (shared) —
# the heavy extension/landing deps (vite, next, pdfjs, ai-sdk, …) are never
# downloaded. There is NO build step: the server runs TypeScript directly via tsx.
#
# Build context must be the REPO ROOT. On Railway: set the service's
# "Dockerfile Path" to `server/Dockerfile` (root directory stays the repo root).

FROM node:22-slim
RUN corepack enable
WORKDIR /app

# 1) Workspace manifests first, for Docker layer caching (deps only re-install
#    when a package.json / lockfile changes). All members are copied so the
#    frozen-lockfile install sees a complete workspace.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc .nvmrc ./
COPY shared/package.json    ./shared/package.json
COPY server/package.json    ./server/package.json
COPY extension/package.json ./extension/package.json
COPY landing/package.json   ./landing/package.json

# 2) Install just the server and what it depends on. The trailing "..." pulls in
#    its workspace deps (shared); extension/landing deps are filtered out.
RUN pnpm install --filter "@interview-copilot/server..." --frozen-lockfile --prefer-offline

# 3) Source for only the packages the server needs at runtime.
COPY shared ./shared
COPY server ./server

# Railway injects PORT at runtime; env.ts reads it (defaults to 8787 locally).
EXPOSE 8787
CMD ["pnpm", "--filter", "@interview-copilot/server", "start"]
