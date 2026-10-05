# --------------------------------------------------------------------------
# Build stage: full toolchain (TypeScript, drizzle-kit, tsx) + sources.
# Produces dist/. Also reused by the one-shot `migrate` compose service,
# because drizzle-kit and tsx are devDependencies and must not ship in runtime.
# --------------------------------------------------------------------------
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Copied before the sources so `npm ci` is cached until the lockfile changes.
COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build


# --------------------------------------------------------------------------
# Runtime stage: production dependencies + compiled JavaScript only.
# No TypeScript, no jest, no nodemon/ts-node, no sources, no .env.
# --------------------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# config.logFilePath (LOG_FILE_PATH, default logs/app.log) is relative to the
# working directory, and winston's file transport does not create directories.
# Only this directory is chowned: the process reads node_modules and dist but
# never writes them, and `chown -R /app` would duplicate them into the layer.
RUN mkdir -p logs && chown node:node logs

USER node

CMD ["npm", "start"]
