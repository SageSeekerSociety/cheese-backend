FROM node:23 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY .husky/install.mjs ./.husky/
COPY prisma ./prisma/

FROM base AS dev-deps
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm prisma generate

FROM dev-deps AS dev
WORKDIR /app
COPY . ./
EXPOSE 8000
CMD ["tail", "-f", "/dev/null"]

FROM dev-deps AS prod-deps
WORKDIR /app
ENV NODE_ENV="production"
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm prune --prod --ignore-scripts

# note that we need to use development deps to build the product
FROM dev-deps AS prod-build
WORKDIR /app
COPY . ./
RUN pnpm run build

FROM node:23-slim AS prod
ENV NODE_ENV="production"
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY . ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-build /app/dist ./dist

EXPOSE 8000
CMD ["node", "dist/main"]
