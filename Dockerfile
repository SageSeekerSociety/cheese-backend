FROM node:21 AS base
# There is a preset user `node` in the node docker image, so no need to
# setup a new user.
# USER and WORKDIR are inherited from based stages. However, if the base
# stage is a new image, those need to be set again.
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg
RUN corepack enable
WORKDIR /app
RUN chown node:node -R /app
COPY --chown=node:node package.json pnpm-lock.yaml ./
COPY --chown=node:node .husky/install.mjs ./.husky/
COPY --chown=node:node prisma ./prisma/
USER node

FROM base AS dev-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm prisma generate

FROM dev-deps AS dev
COPY --chown=node:node . ./
RUN mkdir -p /app/uploads && chown node:node -R /app/uploads
EXPOSE 8000
CMD ["tail", "-f", "/dev/null"]

FROM dev-deps AS prod-deps
ENV NODE_ENV="production"
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm prune --prod

# note that we need to use development deps to build the product
FROM dev-deps AS prod-build
COPY . ./
RUN pnpm run build

FROM node:21-slim AS prod
ENV NODE_ENV="production"
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
COPY . ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-build /app/dist ./dist

EXPOSE 8000
CMD ["node", "dist/main"]
