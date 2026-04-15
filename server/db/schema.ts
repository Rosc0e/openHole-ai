import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const graphs = sqliteTable('graphs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title'),
  content: text('content', { mode: 'json' }), // Stores { nodes: [], edges: [] }
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow()
})
