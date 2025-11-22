import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core'

export const graphs = pgTable('graphs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  content: jsonb('content'), // Stores { nodes: [], edges: [] }
  updatedAt: timestamp('updated_at').defaultNow()
})
