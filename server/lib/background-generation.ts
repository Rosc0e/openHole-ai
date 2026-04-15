import { eq } from 'drizzle-orm'
import { db } from '../db'
import { graphs } from '../db/schema'
import type { AIProvider, ChatMessage, ChatNode, GraphContent } from '../../src/types/graph'
import { getProvider } from './providers/registry'

interface StartGraphGenerationInput {
  graphId: string
  nodeId: string
  provider: AIProvider
  baseUrl: string
  apiKey: string
  messages: ChatMessage[]
  model: string
}

interface GenerationState {
  graphId: string
  nodeId: string
  status: 'running'
  runId: string
}

const runningJobs = new Map<string, Promise<void>>()

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}

async function getGraph(graphId: string) {
  const result = await db.select().from(graphs).where(eq(graphs.id, graphId))
  return result[0] ?? null
}

function updateTargetNode(content: GraphContent | null, nodeId: string, updater: (node: ChatNode) => ChatNode) {
  if (!content) {
    throw new Error('Graph content is missing')
  }

  let found = false
  const nodes = content.nodes.map((node) => {
    if (node.id !== nodeId) {
      return node
    }

    found = true
    return updater(node)
  })

  if (!found) {
    throw new Error('Node not found')
  }

  return {
    ...content,
    nodes,
  }
}

async function updateGraphContent(graphId: string, updateContent: (content: GraphContent | null) => GraphContent) {
  const graph = await getGraph(graphId)

  if (!graph) {
    throw new Error('Graph not found')
  }

  const nextContent = updateContent((graph.content as GraphContent | null) ?? null)

  await db.update(graphs).set({ content: nextContent, updatedAt: new Date() }).where(eq(graphs.id, graphId))

  return nextContent
}

async function generateCompletion(input: StartGraphGenerationInput) {
  return getProvider(input.provider).generateText({
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    model: input.model,
    messages: input.messages,
  })
}

export async function startGraphGeneration(input: StartGraphGenerationInput): Promise<GenerationState> {
  const runId = crypto.randomUUID()

  await updateGraphContent(input.graphId, (content) =>
    updateTargetNode(content, input.nodeId, (node) => ({
      ...node,
      data: {
        ...node.data,
        aiText: '',
        tokens: 0,
        model: input.model,
        generationError: null,
        generationRunId: runId,
        generationStatus: 'running',
      },
    })),
  )

  const task = generateCompletion(input)
    .then(async (text) => {
      await updateGraphContent(input.graphId, (content) =>
        updateTargetNode(content, input.nodeId, (node) => {
          if (node.data.generationRunId !== runId) {
            return node
          }

          return {
            ...node,
            data: {
              ...node.data,
              aiText: text,
              tokens: estimateTokens(text),
              generationError: null,
              generationStatus: 'complete',
            },
          }
        }),
      )
    })
    .catch(async (error) => {
      await updateGraphContent(input.graphId, (content) =>
        updateTargetNode(content, input.nodeId, (node) => {
          if (node.data.generationRunId !== runId) {
            return node
          }

          return {
            ...node,
            data: {
              ...node.data,
              aiText: 'Error generating response.',
              generationError: error instanceof Error ? error.message : String(error),
              generationStatus: 'error',
            },
          }
        }),
      )
    })
    .finally(() => {
      runningJobs.delete(runId)
    })

  runningJobs.set(runId, task)

  return {
    graphId: input.graphId,
    nodeId: input.nodeId,
    status: 'running',
    runId,
  }
}
