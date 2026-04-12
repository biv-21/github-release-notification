
## Environment setup

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Running with Docker (recommended)

```bash
docker compose up --build
```

The app will be available at `http://localhost:3303`.

### Running locally

Requires Node.js 20+ and a running PostgreSQL instance.

```bash
yarn install
yarn start
```

## Development

In development mode (`NODE_ENV=dev`) with no SMTP config, the service uses [Ethereal](https://ethereal.email/) — a fake SMTP server. Email preview URLs are printed to the console.

```bash
yarn start:dev   # watch mode with auto-restart
yarn test        # run unit tests
yarn lint        # lint with Biome
```