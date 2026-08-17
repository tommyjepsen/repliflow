/**
 * Share codes: a canvas's structure as a single pasteable line.
 *
 * Only the graph is shared — prompts, model choices and settings — never the
 * generated output or its local asset keys, which mean nothing on another
 * machine. Edges reference node indices so no id remapping is needed on import.
 */

import type { Edge } from '@xyflow/react'
import { getEffect, type EffectParams } from './effects'
import { getModel } from './models'
import type { AppNode, GenNodeData, EffectNodeData, ImageNodeData, PromptNodeData } from '@/store'

const PREFIX = 'repliflow:v1:'
/** Codes handed out before the rename. */
const LEGACY_PREFIX = 'replicater:v1:'

type SharedNode =
  | { type: 'prompt'; x: number; y: number; text: string }
  | { type: 'image'; x: number; y: number; url: string }
  | {
      type: 'gen'
      x: number
      y: number
      modelId: string
      prompt: string
      inputs: Record<string, unknown>
    }
  | { type: 'effect'; x: number; y: number; effectId: string; params: EffectParams }

type SharedGraph = {
  v: 1
  title: string
  nodes: SharedNode[]
  /** [sourceIndex, targetIndex] pairs. */
  edges: [number, number][]
}

// ---- Encoding -------------------------------------------------------------

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(encoded: string) {
  const binary = atob(encoded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function buildGraph(title: string, nodes: AppNode[], edges: Edge[]): SharedGraph {
  const indexById = new Map<string, number>()
  const shared: SharedNode[] = []

  for (const node of nodes) {
    const x = Math.round(node.position.x)
    const y = Math.round(node.position.y)

    if (node.type === 'prompt') {
      indexById.set(node.id, shared.length)
      shared.push({ type: 'prompt', x, y, text: (node.data as PromptNodeData).text })
    } else if (node.type === 'image') {
      const data = node.data as ImageNodeData
      indexById.set(node.id, shared.length)
      // Uploaded files stay local — only a remote URL means anything elsewhere,
      // so the node travels empty and asks the recipient for their own image.
      shared.push({ type: 'image', x, y, url: /^https?:\/\//i.test(data.url) ? data.url : '' })
    } else if (node.type === 'gen') {
      const data = node.data as GenNodeData
      indexById.set(node.id, shared.length)
      shared.push({
        type: 'gen',
        x,
        y,
        modelId: data.modelId,
        prompt: data.prompt,
        inputs: data.inputs,
      })
    } else if (node.type === 'effect') {
      const data = node.data as EffectNodeData
      indexById.set(node.id, shared.length)
      shared.push({ type: 'effect', x, y, effectId: data.effectId, params: data.params })
    }
  }

  const sharedEdges = edges
    .map((edge) => [indexById.get(edge.source), indexById.get(edge.target)])
    .filter((pair): pair is [number, number] => pair[0] !== undefined && pair[1] !== undefined)

  return { v: 1, title, nodes: shared, edges: sharedEdges }
}

export function encodeShare(title: string, nodes: AppNode[], edges: Edge[]) {
  return PREFIX + toBase64(JSON.stringify(buildGraph(title, nodes, edges)))
}

/**
 * The same graph as a share code, but as readable JSON for a file on disk.
 * `parseShare` accepts raw JSON, so a downloaded file imports as-is.
 */
export function encodeShareFile(title: string, nodes: AppNode[], edges: Edge[]) {
  return JSON.stringify(buildGraph(title, nodes, edges), null, 2)
}

/** `my project` → `my-project.repliflow.json`. */
export function shareFilename(title: string) {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled'
  return `${slug}.repliflow.json`
}

// ---- Decoding -------------------------------------------------------------

export type ParsedShare = {
  title: string
  nodes: SharedNode[]
  edges: [number, number][]
  /** Models or effects in the code that this build doesn't know about. */
  skipped: string[]
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Parses a share code. Accepts the prefixed form, bare base64, or raw JSON, and
 * validates every field — this is untrusted input from someone else.
 */
export function parseShare(input: string): ParsedShare {
  const text = input.trim()
  if (!text) throw new Error('Nothing to import')

  let json: string
  if (text.startsWith(PREFIX)) {
    json = fromBase64(text.slice(PREFIX.length).trim())
  } else if (text.startsWith(LEGACY_PREFIX)) {
    json = fromBase64(text.slice(LEGACY_PREFIX.length).trim())
  } else if (text.startsWith('{')) {
    json = text
  } else {
    try {
      json = fromBase64(text)
    } catch {
      throw new Error('That does not look like a share code')
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('The share code is corrupt')
  }

  if (!isRecord(parsed) || parsed.v !== 1) throw new Error('Unsupported share code version')
  if (!Array.isArray(parsed.nodes)) throw new Error('The share code has no nodes')

  const skipped: string[] = []
  const nodes: SharedNode[] = []
  /** Original index → new index, so edges survive skipped nodes. */
  const remap = new Map<number, number>()

  parsed.nodes.forEach((raw, originalIndex) => {
    if (!isRecord(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) return
    const at = { x: raw.x, y: raw.y }

    if (raw.type === 'prompt') {
      remap.set(originalIndex, nodes.length)
      nodes.push({ type: 'prompt', ...at, text: typeof raw.text === 'string' ? raw.text : '' })
      return
    }

    if (raw.type === 'image') {
      remap.set(originalIndex, nodes.length)
      const url = typeof raw.url === 'string' && /^https?:\/\//i.test(raw.url) ? raw.url : ''
      nodes.push({ type: 'image', ...at, url })
      return
    }

    if (raw.type === 'gen' && typeof raw.modelId === 'string') {
      if (!getModel(raw.modelId)) {
        skipped.push(raw.modelId)
        return
      }
      remap.set(originalIndex, nodes.length)
      nodes.push({
        type: 'gen',
        ...at,
        modelId: raw.modelId,
        prompt: typeof raw.prompt === 'string' ? raw.prompt : '',
        inputs: isRecord(raw.inputs) ? raw.inputs : {},
      })
      return
    }

    if (raw.type === 'effect' && typeof raw.effectId === 'string') {
      if (!getEffect(raw.effectId)) {
        skipped.push(raw.effectId)
        return
      }
      remap.set(originalIndex, nodes.length)
      nodes.push({
        type: 'effect',
        ...at,
        effectId: raw.effectId,
        params: isRecord(raw.params) ? (raw.params as EffectParams) : {},
      })
    }
  })

  if (nodes.length === 0) throw new Error('No usable nodes in that share code')

  const rawEdges = Array.isArray(parsed.edges) ? parsed.edges : []
  const edges = rawEdges
    .map((pair) => {
      if (!Array.isArray(pair) || pair.length < 2) return null
      const source = remap.get(pair[0] as number)
      const target = remap.get(pair[1] as number)
      return source === undefined || target === undefined ? null : ([source, target] as [number, number])
    })
    .filter((pair): pair is [number, number] => pair !== null)

  return {
    title: typeof parsed.title === 'string' && parsed.title ? parsed.title : 'imported',
    nodes,
    edges,
    skipped: [...new Set(skipped)],
  }
}
