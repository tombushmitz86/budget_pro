# BudgetPro - Vite + React app
# Build: docker build -t budgetpro .
# Run:   docker run -p 3000:3000 budgetpro

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG GEMINI_API_KEY
ARG VITE_API_URL
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder /app/dist ./dist
RUN chown -R appuser:nodejs /app
USER appuser
EXPOSE 3000
# Serve built SPA (single-page app mode for client-side routing)
CMD ["npx", "--yes", "serve", "dist", "-s", "-l", "3000"]
