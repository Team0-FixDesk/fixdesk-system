# Build Vue
FROM node:lts AS build-stage

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Debug: Check node_modules and vite installation
RUN ls -la node_modules/.bin/ | head -10
RUN which node
RUN which npm  
RUN npm list vite

# Fix permissions and PATH
RUN chmod -R 755 node_modules/.bin
ENV PATH="/app/node_modules/.bin:$PATH"

# Build with explicit path
RUN ./node_modules/.bin/vite build

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
