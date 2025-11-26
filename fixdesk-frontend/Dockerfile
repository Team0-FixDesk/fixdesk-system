# Build Vue
FROM node:lts AS build-stage

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

WORKDIR /app

# Install yarn for better dependency management
RUN npm install -g yarn

COPY package*.json ./

# Use yarn for more reliable dependency resolution
RUN yarn install --frozen-lockfile || yarn install
COPY . .

# Verify vite installation
RUN yarn list vite
RUN which vite || echo "vite not in PATH"

# Build with yarn
RUN yarn build

# Serve with nginx
FROM nginx:alpine AS production-stage

# Install wget for health checks
RUN apk add --no-cache wget

# Copy built files
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
