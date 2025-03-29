# ---- Base ----
# Use a slim image as the base for consistency and smaller size than the full node image.
FROM node:23-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
# Enable corepack to use pnpm
RUN corepack enable
WORKDIR /app

# ---- Dependencies ----
# Install ALL dependencies (dev + prod) needed for building the app and generating Prisma client.
FROM base AS deps
WORKDIR /app
# Copy only package files and prisma schema required for installation/generation
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
# Install all dependencies using pnpm cache for speed
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# Generate Prisma client (requires dev dependencies)
RUN pnpm prisma generate

# ---- Development ----
# Stage with full source code and all dependencies (dev + prod) for testing/dev tasks
FROM deps AS development
WORKDIR /app
# Copy the rest of the source code
COPY . .
# Expose port if needed for dev server started by compose (e.g., if pnpm start:dev runs)
EXPOSE 8000
# Default command to keep container running for exec commands
CMD ["tail", "-f", "/dev/null"]

# ---- Build ----
# Build stage now starts from 'development' as it has the code and all deps needed for build
# No need to copy source code again here.
FROM development AS build
WORKDIR /app
# Run the build script (uses dev dependencies from 'development' stage)
RUN pnpm run build
# Prune dev dependencies for the final production image
RUN pnpm prune --prod --ignore-scripts

# ---- Production ----
# Final, size-optimized production image.
FROM node:23-slim AS production
ENV NODE_ENV="production"
WORKDIR /app
# Sets the workdir, usually created as root

# Install only essential runtime OS dependencies.
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client ffmpeg openssl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy necessary artifacts from previous stages
COPY package.json pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Optionally copy prisma if needed for migrations at runtime
# COPY --from=build /app/prisma ./prisma # Make sure this is copied if db push needs it

EXPOSE 8000

# Create non-root user and group first
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Change ownership of the app directory to the non-root user BEFORE switching user
# This allows the user to write files if needed (like the FLAG_INIT)
RUN chown nestjs:nodejs .

# Switch to non-root user
USER nestjs

# Default command (will be overridden by docker-compose)
CMD ["node", "dist/main"]