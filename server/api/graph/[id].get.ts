import { db } from '../../db'
import { graphs } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Graph ID is required'
    })
  }

  const result = await db.select().from(graphs).where(eq(graphs.id, id))

  if (result.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Graph not found'
    })
  }

  return result[0]
})
