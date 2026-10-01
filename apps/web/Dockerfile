FROM node:22-alpine AS deps
WORKDIR /workspace/apps/web
COPY apps/web/package.json ./
RUN npm install --no-audit --no-fund

FROM node:22-alpine AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
WORKDIR /workspace/apps/web
COPY --from=deps /workspace/apps/web/node_modules ./node_modules
COPY apps/web ./
RUN mkdir -p public && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js public/ is optional; ensure the runtime image always has the directory.
COPY --from=build /workspace/apps/web/.next ./.next
COPY --from=build /workspace/apps/web/public ./public
COPY --from=build /workspace/apps/web/package.json ./package.json
COPY --from=build /workspace/apps/web/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
