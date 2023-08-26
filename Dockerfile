FROM node:19

WORKDIR /usr/src/boobspics

COPY package*.json .

RUN npm install

RUN npx babel ./src -d ./lib

COPY . .


EXPOSE 3443

CMD [ "node", "./lib/run.js" ]
