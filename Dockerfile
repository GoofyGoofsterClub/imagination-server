FROM node:24-bookworm-slim AS dependencies
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /usr/src/boobspics
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY babel.config.json ./
COPY src ./src
COPY scripts ./scripts
COPY private ./private
COPY public ./public
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /usr/src/boobspics
COPY --from=build /usr/src/boobspics/node_modules ./node_modules
COPY --from=build /usr/src/boobspics/lib ./lib
COPY --from=build /usr/src/boobspics/public ./public
COPY --from=build /usr/src/boobspics/package.json ./package.json
COPY migrations ./migrations
COPY LICENSE.md ./LICENSE.md
RUN mkdir -p privateuploads
EXPOSE 3443
CMD ["node", "./lib/run.js"]
