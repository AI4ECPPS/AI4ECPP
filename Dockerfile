# AI4ECPP - Railway Deployment
# Node.js + Python (for Policy Analyst & Policy DL Agent)

FROM node:20-bookworm

# Install Python 3 and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (Policy Analyst + Policy DL Agent)
# Use PyTorch CPU-only version - smaller & faster to install, avoids build timeout
COPY server/scripts/requirements.txt /tmp/base-requirements.txt
COPY server/scripts/policy_dl_agent/requirements.txt /tmp/dl-requirements.txt
RUN pip3 install --break-system-packages torch --index-url https://download.pytorch.org/whl/cpu && \
    pip3 install --break-system-packages \
    -r /tmp/base-requirements.txt \
    scikit-learn scipy

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install Node dependencies
# Frontend: needs devDependencies (vite) for build
RUN npm ci
# Backend: production only
RUN cd server && npm ci --omit=dev

# Copy frontend source and build
COPY . .
# Build frontend with production API URL (same-origin)
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Server will serve static files from ../dist
WORKDIR /app/server

# Expose port (Railway provides PORT env var)
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server.js"]
