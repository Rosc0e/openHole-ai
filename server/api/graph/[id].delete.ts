import { eq } from 'drizzle-orm'
import { createError, defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { db } from '../../db'
import { graphs } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Graph ID is required',
    })
  }

  await db.delete(graphs).where(eq(graphs.id, id))
  setResponseStatus(event, 204)
  return null
})
