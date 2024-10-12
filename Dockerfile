FROM node:19

WORKDIR /usr/src/boobspics

COPY package*.json .

RUN npm install --save-dev

COPY . .

EXPOSE 3443

RUN npx babel src -d lib

CMD [ "node", "./lib/run.js" ]
