# Dockerfile - Multi-stage for Face Recognition

# --- Base Stage (Install dependencies & build native modules) ---
FROM node:18-bullseye AS base
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y \
    python3 make g++ pkg-config libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev \
    build-essential curl libprotobuf-dev \
    && rm -rf /var/lib/apt/lists/*
RUN npm ci --omit=dev
# Rebuild tfjs-node native binding agar tfjs_binding.node tersedia
RUN npm rebuild @tensorflow/tfjs-node --build-from-source

# --- Test Stage ---
FROM base AS test
COPY . .
ENV NODE_ENV=test
RUN npm run test

# --- Production Stage ---
FROM node:18-bullseye AS prod
WORKDIR /app
# Install runtime native dependencies for canvas/tfjs-node
RUN apt-get update && apt-get install -y \
    libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*
# Copy node_modules hasil build dari base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY . .
# Tambahkan user non-root untuk security
RUN useradd -m appuser && chown -R appuser /app
USER appuser
ENV NODE_ENV=production
EXPOSE 3000
RUN npm cache clean --force
CMD ["node", "src/server.js"] 