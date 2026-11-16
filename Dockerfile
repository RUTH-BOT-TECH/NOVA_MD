FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates python3 python3-pip ffmpeg curl unzip \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp binary (kept current with curl -L ... /latest) + ffmpeg for audio remux & video merge
RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV SESSION_DIR=/data/sessions
# hosting platforms route traffic to this port; the bot serves GET /health on it
ENV PORT=8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
