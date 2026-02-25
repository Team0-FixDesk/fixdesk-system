FROM node:lts-alpine

WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/uploads/repair && \
    chmod -R 755 /app/uploads

EXPOSE 8059

CMD ["node", "server.js"]
