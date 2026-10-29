FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY src/Frontend/package.json src/Frontend/package-lock.json ./
RUN npm ci --no-fund

FROM dependencies AS build
ARG API_URL=http://api:8080
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MEDIA_URL
ARG NEXT_IMAGE_UNOPTIMIZED=false
ENV API_URL=${API_URL} NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_PUBLIC_MEDIA_URL=${NEXT_PUBLIC_MEDIA_URL} NEXT_IMAGE_UNOPTIMIZED=${NEXT_IMAGE_UNOPTIMIZED} NEXT_TELEMETRY_DISABLED=1
COPY src/Frontend/ ./
RUN mkdir -p public && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --chown=node:node deploy/frontend-entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod 755 ./entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=4s --start-period=30s --retries=6 CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./entrypoint.sh"]
