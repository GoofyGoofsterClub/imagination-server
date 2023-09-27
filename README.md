# Imagination Server

A file server with built-in user and file management, built on NodeJS.

## Installation

### With Docker

```bash
$ git clone https://github.com/LMNYX/imagination-server.git
$ cd imagination-server
$ docker compose up
```

### Without Docker

Prerequisites include [MongoDB](https://www.mongodb.com/) and NodeJS being installed on the machine.

```bash
$ git clone https://github.com/LMNYX/imagination-server.git
$ cd imagination-server
$ cp .example.env .env
$ set -o allexport && source .env set && set +o allexport
$ node run build # or yarn build
$ node run start # or yarn start
```