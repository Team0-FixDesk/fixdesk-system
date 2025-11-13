FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/uploads/repair && \
    chmod -R 755 /app/uploads

EXPOSE 3000

CMD ["node", "index.js"]
