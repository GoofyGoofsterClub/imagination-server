# Imagination Server

A file server with built-in user and file management, built on NodeJS.

## Dependencies

1. [Docker or Docker Desktop](https://docs.docker.com/engine/install/), if you are on Windows
2. [NodeJS](https://nodejs.org/en) (Tested on 19+)
3. [MongoDB](https://www.mongodb.com/) (Tested on 5.0.2)

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

## After installation

After installation you will need to log in with administrator account, create a new account for yourself and **delete the initial one**.

To do so, open terminal after **initial start up** and look for the line that looks like this:

```No users found in the database. Please go to /invite/randomletters to create an account.```

Copy the link and open it in the browser, on the domain you're hosting the server, agree to the invitation and copy the key, then go to the main page and click on Dashboard, or open `/#dashboard`, put the key in and create a new account.

Preferably ban `uwu` account or delete it altogheter, because the key is **NOT** unique.

## Troubleshooting

### Server crashing after around 10 seconds (without docker)

Environment variables were not created, most likely. To fix, run this:

```bash
$ cp .example.env
$ set -o appexport
$ source .env set
$ set +o allexport
```

If this didn't help, check if your MongoDB credentials are correct in the `.env` file.

### Server crashing after around 10 seconds (with docker)

Environment variables are incorrectly configured, check `.env`, most likely, expose port is already used.

### API endpoints in `/docs` are not correct.

Please run `node generate_docs.js` if you have modified API endpoints to re-generate the JSON Documentation.

If you get a permissions error, allow writing and reading of the file `public/api.json`
