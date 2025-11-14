# Build Vue
FROM node:lts AS build-stage

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod -R 755 node_modules/.bin

RUN npm run build

# Serve with nginx
FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
