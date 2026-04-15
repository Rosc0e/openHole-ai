import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL || './.data/rabbitnode.sqlite'
const databasePath = databaseUrl.startsWith('file:')
  ? databaseUrl.slice('file:'.length)
  : databaseUrl.startsWith('sqlite:')
    ? databaseUrl.slice('sqlite:'.length)
    : databaseUrl

if (!databasePath.includes(':memory:')) {
  const dataDir = dirname(databasePath)
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
}

const client = new Database(databasePath)
export const db = drizzle(client, { schema })
