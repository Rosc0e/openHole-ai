import { db } from '../db'
import { graphs } from '../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { id, title, content } = body

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Graph ID is required'
    })
  }

  // Check if graph exists
  const existing = await db.select().from(graphs).where(eq(graphs.id, id))

  if (existing.length > 0) {
    // Update
    await db.update(graphs)
      .set({ 
        content, 
        title: title || existing[0].title,
        updatedAt: new Date() 
      })
      .where(eq(graphs.id, id))
  } else {
    // Insert
    await db.insert(graphs).values({
      id,
      title: title || 'Untitled Graph',
      content
    })
  }

  return { success: true }
})
