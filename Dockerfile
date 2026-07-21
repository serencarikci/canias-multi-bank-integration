FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd -r appuser && useradd -r -g appuser appuser
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY src ./src
COPY config ./config
RUN cp config/banks.example.json config/banks.json
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
