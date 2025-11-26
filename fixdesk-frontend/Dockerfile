# Build Vue
FROM node:lts AS build-stage

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

WORKDIR /app
COPY package*.json ./

# Clear npm cache and install with verbose logging
RUN npm cache clean --force
RUN npm install --verbose --no-optional
COPY . .

# Debug: Check installation
RUN ls -la node_modules/.bin/ | grep -i vite || echo "vite not found in .bin"
RUN npm list --depth=0 | grep vite || echo "vite not in package list"
RUN find /app -name "vite" -type f || echo "vite executable not found"

# Try multiple approaches to run vite
RUN chmod -R 755 node_modules/.bin
ENV PATH="/app/node_modules/.bin:$PATH"

# Build with different methods
RUN npx --yes vite@latest build || \
    ./node_modules/.bin/vite build || \
    node ./node_modules/vite/bin/vite.js build

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
