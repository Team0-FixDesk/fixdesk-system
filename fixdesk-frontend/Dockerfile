# Build Vue
FROM node:lts AS build-stage

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --include=dev --workspaces=false

COPY . .
RUN npm run build

# Serve with nginx
FROM nginx:alpine AS production-stage

RUN apk add --no-cache wget

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
