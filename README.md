# Imagination Server

> [!WARNING]  
> This project is deprecated. All original imagination server instances will go offline on July 1st, 2027 due to the technical debt and lack of interest to continue the project.
> Please see [Phantasia](https://github.com/GoofyGoofsterClub/phantasia), an imagination server work-in-progress successor.
>
> Yes, I am deprecating a project without a stable successor project in mind, because Phantasia itself **is also out of scope of my interest** for now, that means there will be no continuation of this project as of now (June 18th, 2026).
>
> For now, please find a better implementation somewhere else. You can star and watch the [Phantasia](https://github.com/GoofyGoofsterClub/phantasia)'s repository to know when I get motivation to get back on track.
>
<details>
<summary>⚠️ &lt;CLICK&gt; For previous and active original instance (uwu.so) users &lt;CLICK&gt; ⚠️</summary>

As I am not yet sure if Phantasia will ever be complete, I cannot be sure if I will migrate uwu.so to it. I'd recommend downloading important files and uploading them somewhere else.

When and if I realize that I will 100% not be migrating to Phantasia I will open an archive download for all users (even banned ones) to get their stuff downloaded fast and easy. However, if I do migrate to Phantasia all your files will be migrated and you will be able to keep using the uwu.so instance as usual, minus the API changes.

### Changes

Because Phantasia is a complete rewrite and a major upgrade there **will be** major API structure changes. That means your uploader will break and that is guaranteed. You might not like it, you might say "well you could add a redirect for old route users", but the entire point of Phantasia was to get rid of technical debt we've collected over the time and that will completely contradict the point.

Database structure is also changed that means there might be some inaccuracy at the beginning, however I'll try to mitigate that. That also means new users (which is rare) will have different API keys.

Also, since the beginning I've managed all the keys, when it was just a JSON file, since then we've came a long way and there is still no way to reset a key without my help, that will change in Phantasia, because we're adding zero-assist key resets using additional (completely optional) account links.

<br><hr>
</details>

A file server with built-in user and file management, built on NodeJS.

## Dependencies

1. [Docker or Docker Desktop](https://docs.docker.com/engine/install/), if you are on Windows
2. [NodeJS](https://nodejs.org/en) (Tested on 19+)
3. [PostgreSQL](https://www.postgresql.org/) (Tested on 16.4)

## Contributing

> [!NOTE]  
> This codebase is feature-locked and will only be modified when a feature-breaking bug is discovered.
> Please check out the new version of media server when it's out!

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
