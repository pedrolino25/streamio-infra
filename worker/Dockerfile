############################
# Build stage
############################
FROM node:20-bullseye AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

############################
# Runtime stage
############################
FROM linuxserver/ffmpeg:version-6.0

# 🔥 CRITICAL FIX: remove ffmpeg ENTRYPOINT
ENTRYPOINT []

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Set Node.js memory limit to 512MB to leave more RAM for FFmpeg
# For 2GB videos, container should have at least 4GB total memory
# Node gets 512MB, FFmpeg gets the rest (~3.5GB)
ENV NODE_OPTIONS="--max-old-space-size=512"

CMD ["node", "dist/index.js"]
