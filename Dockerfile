FROM oven/bun:1 as base
WORKDIR /app

# install dependencies
COPY package.json bun.lock ./
RUN bun install

# copy source
COPY . .

# build
RUN bun run build

# start
CMD ["bun", ".output/server/index.mjs"]
