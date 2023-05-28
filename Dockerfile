FROM node:19

WORKDIR /usr/src/boobspics

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 3443

CMD [ "node", "index.js" ]
