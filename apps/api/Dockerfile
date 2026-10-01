FROM node:22-alpine AS deps
WORKDIR /workspace/apps/api
COPY apps/api/package.json ./
RUN npm install --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /workspace/apps/api
COPY --from=deps /workspace/apps/api/node_modules ./node_modules
COPY apps/api ./
RUN npm run prisma:generate && npm run build && (test -f dist/src/main.js || test -f dist/main.js)

FROM node:22-alpine AS runner
WORKDIR /workspace/apps/api
ENV NODE_ENV=production
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=build /workspace/apps/api/prisma ./prisma
COPY --from=build /workspace/apps/api/node_modules ./node_modules
COPY --from=build /workspace/apps/api/package.json ./package.json
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
