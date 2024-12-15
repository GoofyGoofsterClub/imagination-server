# Imagination Server

A file server with built-in user and file management, built on NodeJS.

## Dependencies

1. [Docker or Docker Desktop](https://docs.docker.com/engine/install/), if you are on Windows
2. [NodeJS](https://nodejs.org/en) (Tested on 19+)
3. [PostgreSQL](https://www.postgresql.org/) (Tested on 16.4)

## Contributing

Imagination server welcomes all contributors, but keep in mind that the project is mostly finished and no new features are being considered as of now. If you wish to add a new section, feature, or change design, please open an issue first, before creating a pull request, to insure that you don't waste your time for nothing.

<!-- If you wish to help translate project, please use [POEditor](https://poeditor.com/join/project/GWroOdMlYw). If the project is full and you wish to contribute for a language that is not yet on the website, please email `me@reze.moe`.

If you found a misspelling or incorrect grammar in template (`/public/popovers` and `/private/`), please create an issue. If you found a misspelling or incorrect grammar in translation (`/public/translations/`), please use [POEditor](https://poeditor.com/join/project/GWroOdMlYw). -->

For code standards use the config provided for `Prettier`.

## Installation

### With Docker

```bash
$ git clone https://github.com/LMNYX/imagination-server.git
$ cd imagination-server
$ cp .example.env .env
$ docker compose up -d
```

### Without Docker

Prerequisites include [PostgreSQL](https://www.postgresql.org/) and NodeJS being installed on the machine.

```bash
$ git clone https://github.com/LMNYX/imagination-server.git
$ cd imagination-server
$ cp .example.env .env
$ set -o allexport && source .env set && set +o allexport
$ node run build # or yarn build
$ node run start # or yarn start
```

## After installation

After you started the server, you will need to open the service in your browser and set username for root user and title for web pages.

When you complete the setup and press the button to do so, you will be displayed the key for access to your account. It will not be displayed again after that.

When you're ready refresh the page and you will be able to access the service's functionality.

## Troubleshooting

### Server crashing after around 10 seconds (without docker)

Environment variables were not created, most likely. To fix, run this:

```bash
$ cp .example.env
$ set -o appexport
$ source .env set
$ set +o allexport
```

If this didn't help, check if your PostgreSQL credentials are correct in the `.env` file.

### Server crashing after around 10 seconds (with docker)

Environment variables are incorrectly configured, check `.env`, or, most likely, expose port is already used.

### API endpoints in `/docs` are not correct.

Please run `node generate_docs.js` if you have modified API endpoints to re-generate the JSON Documentation.

If you get a permissions error, allow writing and reading of the file `public/api.json`
