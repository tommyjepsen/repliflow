import type { Edge } from '@xyflow/react'
import { idbDelete, idbDeletePrefix, idbGet, idbGetAll, idbPut } from './db'
import { writeToFolder } from './fs'
import type { OutputKind } from './models'
import type { AppNode } from '@/store'

export type StoredProject = {
  id: string
  title: string
  nodes: AppNode[]
  edges: Edge[]
  createdAt: number
  updatedAt: number
}

export type ProjectMeta = Pick<StoredProject, 'id' | 'title' | 'createdAt' | 'updatedAt'> & {
  nodeCount: number
}

const LAST_OPENED = 'replicater.lastProject'

export function newProjectId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const all = await idbGetAll<StoredProject>('projects')
  return all
    .map((p) => ({
      id: p.id,
      title: p.title,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      nodeCount: p.nodes?.length ?? 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function loadProject(id: string) {
  return idbGet<StoredProject>('projects', id)
}

export function saveProject(project: StoredProject) {
  return idbPut('projects', project)
}

export async function deleteProject(id: string) {
  await idbDelete('projects', id)
  await idbDeletePrefix('assets', `${id}:`)
  await idbDeletePrefix('gallery', `${id}:`)
}

export function rememberLastOpened(id: string) {
  localStorage.setItem(LAST_OPENED, id)
}

export function getLastOpened() {
  return localStorage.getItem(LAST_OPENED)
}

/** Asset keys are prefixed by project id so deleting a project cleans up its blobs. */
export function assetKey(projectId: string, nodeId: string, predictionId: string) {
  return `${projectId}:${nodeId}:${predictionId}`
}

/** An image node's uploaded source. One stable key per node, so replacing overwrites. */
export function sourceAssetKey(projectId: string, nodeId: string) {
  return `${projectId}:${nodeId}:source`
}

/** Copies a stored blob to another key, e.g. when a project is duplicated. */
export async function copyAsset(from: string, to: string) {
  const blob = await getAsset(from)
  if (!blob) return null
  await putAsset(to, blob)
  return blob
}

export function putAsset(key: string, blob: Blob) {
  return idbPut('assets', blob, key)
}

export function getAsset(key: string) {
  return idbGet<Blob>('assets', key)
}

/**
 * Downloads a finished prediction so it survives the delivery URL expiring.
 * Returns null when the fetch is blocked, in which case the remote URL is kept.
 */
export async function cacheAsset(key: string, url: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    await putAsset(key, blob)
    return blob
  } catch {
    return null
  }
}

/**
 * Replicate accepts data URIs for file inputs, which is how locally produced
 * output (an effect result) gets fed back into a hosted model.
 */
export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// ---- Gallery --------------------------------------------------------------

export type GalleryEntry = {
  /** Same key as the cached blob in the `assets` store. */
  key: string
  projectId: string
  projectTitle: string
  nodeId: string
  modelId: string
  modelName: string
  kind: OutputKind
  filename: string
  remoteUrl: string
  createdAt: number
}

export function recordGeneration(entry: GalleryEntry) {
  return idbPut('gallery', entry)
}

export async function listGallery(): Promise<GalleryEntry[]> {
  const all = await idbGetAll<GalleryEntry>('gallery')
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteGalleryEntry(key: string) {
  await idbDelete('gallery', key)
  await idbDelete('assets', key)
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'model/gltf-binary': 'glb',
}

/** Best-effort file extension, preferring the URL over the MIME type. */
export function extensionFor(url: string, blob: Blob) {
  const fromUrl = new URL(url, location.href).pathname.split('.').pop()
  if (fromUrl && fromUrl.length <= 5 && /^[a-z0-9]+$/i.test(fromUrl)) return fromUrl.toLowerCase()
  return EXTENSIONS[blob.type] ?? 'bin'
}

export function buildFilename(modelName: string, predictionId: string, extension: string) {
  const slug = modelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}-${predictionId.slice(0, 8)}.${extension}`
}

/**
 * Saves a blob to disk. Prefers the nominated folder's `repliflow/` subfolder;
 * otherwise falls back to an ordinary browser download, which always lands in
 * the default Downloads directory (the `download` attribute cannot name a path).
 */
export async function saveToDisk(blob: Blob, filename: string) {
  if (await writeToFolder(blob, filename)) return 'folder' as const

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoke on the next tick so the download has picked the blob up.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloads' as const
}
