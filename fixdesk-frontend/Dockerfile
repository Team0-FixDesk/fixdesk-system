# Build Vue
FROM node:lts AS build-stage

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod -R 755 node_modules/.bin

# Verify vite installation and build
RUN npx vite --version
RUN npm run build

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
