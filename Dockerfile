FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --include=dev

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Tangkapan layar panduan. Sengaja di luar `public/`: disajikan route bergerbang
# sesi karena memuat data santri, tagihan, dan layar pemasangan WhatsApp.
COPY --from=builder --chown=nextjs:nodejs /app/docs-assets ./docs-assets
USER nextjs
EXPOSE 3226
ENV PORT=3226
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
