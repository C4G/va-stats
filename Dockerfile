# Base image with Node.js
FROM node:24-alpine AS base

# Enable corepack and prepare the version pinned in package.json
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# NEXT_PUBLIC_BASE_URL deliberately unset: Next.js only inlines NEXT_PUBLIC_* vars
# that exist at build time, so one image works for both test and production.

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Install dependencies (ignore-scripts skips husky's prepare hook;
# native packages such as sharp ship prebuilt binaries so no build step is needed)
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --store-dir=/pnpm/store

# The install above intentionally skips lifecycle scripts, so generate the
# typed client explicitly before compiling the application.
RUN pnpm prisma generate

# Copy source code
COPY . .

# Build the Next.js application (produces the standalone server output)
RUN pnpm run build

# Production image, copy only what is needed and run migrations before Next.js
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install the Prisma runtime requirements and wget for the container healthcheck
RUN apk add --no-cache openssl wget

# Copy the standalone build output with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# The runtime image is intentionally minimal, so provide the Prisma CLI and
# dotenv used by prisma.config.ts without copying the full pnpm dependency tree.
RUN npm install -g --allow-scripts=prisma,@prisma/engines prisma@7.10.0 dotenv@16.6.1 \
    && mkdir -p /app/node_modules \
    && rm -f /app/node_modules/dotenv \
    && cp -RL /usr/local/lib/node_modules/dotenv /app/node_modules/dotenv \
    && rm -f /app/node_modules/prisma \
    && cp -RL /usr/local/lib/node_modules/prisma /app/node_modules/prisma

ENV NODE_PATH=/usr/local/lib/node_modules

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Apply pending migrations before starting the application.
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
