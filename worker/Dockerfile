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
FROM linuxserver/ffmpeg:latest

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

CMD ["node", "dist/index.js"]
