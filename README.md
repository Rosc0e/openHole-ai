# RabbitNode

React + Vite power the frontend app shell, and Nitro serves the existing backend API routes.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the Nitro API server and the Vite frontend together:

```bash
# bun
bun run dev
```

- Vite frontend: `http://localhost:5173`
- Nitro API server: `http://localhost:3000`

## Production Build

Build the frontend and Nitro server:

```bash
# bun
bun run build
```

Locally preview production build:

```bash
# bun
bun run preview
```

The built Nitro server is emitted to `.output/server/index.mjs`.
