FROM node:26-alpine3.23

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

EXPOSE 4999

CMD [ "npm", "start" ]