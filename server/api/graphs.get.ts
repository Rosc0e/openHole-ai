import { desc, lt } from 'drizzle-orm'
import { defineEventHandler, getQuery } from 'h3'
import { db } from '../db'
import { graphs } from '../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limitValue = Number(query.limit ?? 10)
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 10
  const cursorValue = typeof query.cursor === 'string' && query.cursor ? new Date(query.cursor) : null

  const builder = db.select({ id: graphs.id, title: graphs.title, updatedAt: graphs.updatedAt }).from(graphs)
  const rows = cursorValue && !Number.isNaN(cursorValue.getTime())
    ? await builder.where(lt(graphs.updatedAt, cursorValue)).orderBy(desc(graphs.updatedAt)).limit(limit)
    : await builder.orderBy(desc(graphs.updatedAt)).limit(limit)

  return {
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: new Date(row.updatedAt ?? Date.now()).toISOString(),
    })),
    nextCursor: rows.length === limit ? new Date(rows[rows.length - 1]?.updatedAt ?? Date.now()).toISOString() : null,
  }
})
