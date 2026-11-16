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
VOLUME ["/data"]

CMD ["node", "src/index.js"]
