import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import { defaultEffectParams, getEffect, type EffectParams } from '@/lib/effects'
import { getModel, type MediaKind } from '@/lib/models'
import {
  deleteGalleryEntry,
  deleteProject,
  getAsset,
  copyAsset,
  putAsset,
  sourceAssetKey,
  listGallery,
  getLastOpened,
  listProjects,
  loadProject,
  newProjectId,
  rememberLastOpened,
  saveProject,
  saveToDisk,
  type GalleryEntry,
  type ProjectMeta,
  type StoredProject,
} from '@/lib/projects'
import { encodeShare, encodeShareFile, parseShare, shareFilename } from '@/lib/share'
import { getTemplate, type TemplateId } from '@/lib/templates'

export type PromptNodeData = {
  text: string
}

export type ImageNodeData = {
  /** IndexedDB key for an uploaded file. */
  assetKey: string | null
  /** Remote image URL, used when nothing was uploaded. */
  url: string
  /** Original filename, shown in the node header. */
  name: string
}

/**
 * What the last run of a gen node cost in time and bytes. Replicate reports no
 * per-prediction charge, so there is no money figure here — only what it tells
 * us, plus what we can measure from the file we downloaded.
 */
export type RunInfo = {
  predictionId: string
  /** Seconds spent in the model, and end to end including any queue wait. */
  predictTime?: number
  totalTime?: number
  startedAt?: number
  completedAt?: number
  /** Size of the cached output file, and its pixel dimensions when it's an image. */
  bytes?: number
  width?: number
  height?: number
  filename?: string
}

export type GenNodeData = {
  modelId: string
  /** Prompt typed on the node itself; a connected prompt node overrides it. */
  prompt: string
  /** Overrides for the model's schema defaults, keyed by input name. */
  inputs: Record<string, unknown>
  status: 'idle' | 'running' | 'succeeded' | 'failed'
  /** Replicate delivery URL. Expires roughly an hour after the run. */
  outputUrl: string | null
  /** IndexedDB key for the cached blob, which does not expire. */
  assetKey: string | null
  /** Set for models that return text rather than a file. */
  outputText: string | null
  error: string | null
  predictionId: string | null
  /** Details of the last finished run, shown in the node's info popover. */
  run: RunInfo | null
}

export type EffectNodeData = {
  effectId: string
  params: EffectParams
  status: 'idle' | 'running' | 'succeeded' | 'failed'
  assetKey: string | null
  error: string | null
}

/** What the lightbox is currently showing. */
export type Preview = {
  url: string
  kind: 'image' | 'video'
  /** Caption, e.g. the model that produced it. */
  title?: string
}

/** One media file arriving from an upstream node. */
export type UpstreamMedia = {
  kind: MediaKind
  /** Remote URL when there is one, otherwise a local blob URL. */
  url: string
  /** Set when a local copy exists, for effects and for data-URI conversion. */
  assetKey?: string
  /**
   * The target handle the edge was dropped on, i.e. the schema field key it is
   * meant for — null when it landed on the node's generic input.
   */
  handle: string | null
}

export type Upstream = {
  prompt: string
  media: Partial<Record<MediaKind, string>>
  /** Asset keys for the same media, for effects that need local pixel access. */
  mediaAssets: Partial<Record<MediaKind, string>>
  /**
   * Every incoming media file, in edge order. Models with more than one image
   * input (first frame / last frame) need each source kept separate, which the
   * one-per-kind maps above cannot express.
   */
  sources: UpstreamMedia[]
}

export type AppNode =
  | Node<PromptNodeData, 'prompt'>
  | Node<ImageNodeData, 'image'>
  | Node<GenNodeData, 'gen'>
  | Node<EffectNodeData, 'effect'>

type State = {
  projectId: string
  projects: ProjectMeta[]
  ready: boolean
  saving: boolean
  title: string
  apiKey: string
  nodes: AppNode[]
  edges: Edge[]
  /** Object URLs for cached assets, keyed by asset key. */
  assetUrls: Record<string, string>

  init: () => Promise<void>
  refreshProjects: () => Promise<void>
  createProject: () => Promise<void>
  openProject: (id: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  duplicateProject: () => Promise<void>

  gallery: GalleryEntry[]
  /** Whether each finished generation is also written to the Downloads folder. */
  autoDownload: boolean
  refreshGallery: () => Promise<void>
  removeGalleryEntry: (key: string) => Promise<void>
  setAutoDownload: (v: boolean) => void

  /** 'system' follows the OS; the other two override it. */
  theme: ThemePref
  /** What 'system' currently resolves to, so components can pick a colour. */
  resolvedTheme: 'light' | 'dark'
  setTheme: (t: ThemePref) => void

  /** Full-screen preview of a single image or video; null when closed. */
  preview: Preview | null
  openPreview: (p: Preview) => void
  closePreview: () => void

  setTitle: (t: string) => void
  setApiKey: (k: string) => void
  registerAsset: (key: string, blob: Blob) => void

  onNodesChange: (c: NodeChange<AppNode>[]) => void
  onEdgesChange: (c: EdgeChange[]) => void
  onConnect: (c: Connection) => void
  addPromptNode: (pos: { x: number; y: number }) => void
  /** Adds a source image node, optionally seeded with a picked or dropped file. */
  addImageNode: (pos: { x: number; y: number }, file?: File) => Promise<string>
  /** Stores a file as an image node's source, replacing whatever it held. */
  setNodeImageFile: (id: string, file: File) => Promise<void>
  addModelNode: (modelId: string, pos: { x: number; y: number }) => void
  addEffectNode: (effectId: string, pos: { x: number; y: number }) => void
  applyTemplate: (id: TemplateId, pos: { x: number; y: number }) => void
  /** Serialises the current canvas as a pasteable share code. */
  exportShare: () => string
  /**
   * Writes a project to disk as a `.repliflow.json` file. Defaults to the open
   * canvas, including edits that have not autosaved yet.
   */
  downloadProject: (id?: string) => Promise<'folder' | 'downloads'>
  /** Imports a share code into a brand new project. */
  importShare: (code: string) => Promise<{ nodes: number; skipped: string[]; title: string }>
  updateNode: (id: string, patch: Record<string, unknown>) => void
  removeNode: (id: string) => void
  duplicateNode: (id: string) => void
  /** Resolves a gen node's effective prompt and source media from its edges. */
  resolveUpstream: (id: string) => Upstream
}

/** Prompt nodes start roomy — they hold paragraphs — and can be dragged bigger. */
export const PROMPT_SIZE = { width: 380, height: 380 }

export type ThemePref = 'system' | 'light' | 'dark'

// Storage keys keep the pre-rename prefix: changing them would orphan every
// saved project, API key and gallery entry already in people's browsers.
const KEY_STORAGE = 'replicater.apiKey'
const DOWNLOAD_STORAGE = 'replicater.autoDownload'
const THEME_STORAGE = 'replicater.theme'

const lightQuery = window.matchMedia('(prefers-color-scheme: light)')

function readThemePref(): ThemePref {
  const stored = localStorage.getItem(THEME_STORAGE)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function resolveTheme(pref: ThemePref) {
  if (pref !== 'system') return pref
  return lightQuery.matches ? 'light' : 'dark'
}

/** The stylesheet keys off this attribute, so 'system' never reaches CSS. */
function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
}

let counter = 0
const nextId = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`

/** True while loading a project, so autosave does not write back mid-swap. */
let hydrating = false

export const useStore = create<State>((set, get) => ({
  projectId: '',
  projects: [],
  ready: false,
  saving: false,
  title: 'untitled',
  apiKey: localStorage.getItem(KEY_STORAGE) ?? '',
  nodes: [],
  edges: [],
  assetUrls: {},
  gallery: [],
  autoDownload: localStorage.getItem(DOWNLOAD_STORAGE) !== 'off',

  refreshGallery: async () => set({ gallery: await listGallery() }),

  removeGalleryEntry: async (key) => {
    await deleteGalleryEntry(key)
    set((s) => {
      if (s.assetUrls[key]) URL.revokeObjectURL(s.assetUrls[key])
      const { [key]: _removed, ...rest } = s.assetUrls
      return { assetUrls: rest, gallery: s.gallery.filter((g) => g.key !== key) }
    })
  },

  setAutoDownload: (autoDownload) => {
    localStorage.setItem(DOWNLOAD_STORAGE, autoDownload ? 'on' : 'off')
    set({ autoDownload })
  },

  init: async () => {
    await get().refreshGallery()
    const projects = await listProjects()
    const wanted = getLastOpened()
    const target = projects.find((p) => p.id === wanted) ?? projects[0]
    if (target) {
      await get().openProject(target.id)
      set({ projects, ready: true })
    } else {
      set({ projects, ready: true })
      await get().createProject()
    }
  },

  refreshProjects: async () => set({ projects: await listProjects() }),

  createProject: async () => {
    const id = newProjectId()
    const now = Date.now()
    const project: StoredProject = {
      id,
      title: 'untitled',
      nodes: [],
      edges: [],
      createdAt: now,
      updatedAt: now,
    }
    await saveProject(project)
    rememberLastOpened(id)
    revokeAssetUrls(get().assetUrls)
    set({ projectId: id, title: project.title, nodes: [], edges: [], assetUrls: {} })
    await get().refreshProjects()
  },

  openProject: async (id) => {
    const project = await loadProject(id)
    if (!project) return

    hydrating = true
    revokeAssetUrls(get().assetUrls)

    // Runs do not survive a reload, so anything left "running" reverts to idle.
    // Prompt nodes saved before they were resizable carry no size, and a node
    // that fills its size needs one, so they get the default.
    const nodes = project.nodes.map((n) => {
      if (n.type === 'gen' && n.data.status === 'running') {
        return { ...n, data: { ...n.data, status: 'idle' } } as AppNode
      }
      if (n.type === 'prompt' && !n.width) return { ...n, ...PROMPT_SIZE } as AppNode
      return n
    })

    set({
      projectId: project.id,
      title: project.title,
      nodes,
      edges: project.edges,
      assetUrls: {},
    })
    rememberLastOpened(project.id)
    hydrating = false

    await hydrateAssets(nodes, set)
    await get().refreshProjects()
  },

  removeProject: async (id) => {
    await deleteProject(id)
    const projects = await listProjects()
    set({ projects })
    await get().refreshGallery()
    if (get().projectId === id) {
      if (projects[0]) await get().openProject(projects[0].id)
      else await get().createProject()
    }
  },

  duplicateProject: async () => {
    const { title, nodes, edges } = get()
    const id = newProjectId()
    const now = Date.now()
    // Asset keys are project-scoped, so generated output points at fresh (empty)
    // keys — but an uploaded source image is input, so its blob is copied over.
    const copiedNodes = await Promise.all(
      nodes.map(async (n) => {
        if (n.type === 'gen') return { ...n, data: { ...n.data, assetKey: null } } as AppNode
        if (n.type === 'image' && n.data.assetKey) {
          const key = sourceAssetKey(id, n.id)
          const copied = await copyAsset(n.data.assetKey, key)
          return { ...n, data: { ...n.data, assetKey: copied ? key : null } } as AppNode
        }
        return n
      }),
    )
    await saveProject({
      id,
      title: `${title} copy`,
      nodes: copiedNodes,
      edges,
      createdAt: now,
      updatedAt: now,
    })
    await get().openProject(id)
  },

  theme: readThemePref(),
  resolvedTheme: resolveTheme(readThemePref()),

  setTheme: (theme) => {
    localStorage.setItem(THEME_STORAGE, theme)
    const resolvedTheme = resolveTheme(theme)
    applyTheme(resolvedTheme)
    set({ theme, resolvedTheme })
  },

  preview: null,
  openPreview: (preview) => set({ preview }),
  closePreview: () => set({ preview: null }),

  setTitle: (title) => set({ title }),

  setApiKey: (apiKey) => {
    localStorage.setItem(KEY_STORAGE, apiKey)
    set({ apiKey })
  },

  registerAsset: (key, blob) =>
    set((s) => {
      if (s.assetUrls[key]) URL.revokeObjectURL(s.assetUrls[key])
      return { assetUrls: { ...s.assetUrls, [key]: URL.createObjectURL(blob) } }
    }),

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) as AppNode[] })),

  onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge({ ...connection, animated: true }, s.edges),
    })),

  addPromptNode: (position) =>
    set((s) => ({
      nodes: [
        ...s.nodes,
        { id: nextId(), type: 'prompt', position, ...PROMPT_SIZE, data: { text: '' } },
      ],
    })),

  addImageNode: async (position, file) => {
    const id = nextId()
    set((s) => ({
      nodes: [
        ...s.nodes,
        { id, type: 'image', position, data: { assetKey: null, url: '', name: '' } },
      ],
    }))
    if (file) await get().setNodeImageFile(id, file)
    return id
  },

  setNodeImageFile: async (id, file) => {
    const key = sourceAssetKey(get().projectId, id)
    await putAsset(key, file)
    get().registerAsset(key, file)
    // A local file wins over any URL previously typed into the node.
    get().updateNode(id, { assetKey: key, name: file.name, url: '' })
  },

  addModelNode: (modelId, position) => {
    if (!getModel(modelId)) return
    set((s) => ({
      nodes: [
        ...s.nodes,
        {
          id: nextId(),
          type: 'gen',
          position,
          data: {
            modelId,
            prompt: '',
            inputs: {},
            status: 'idle',
            outputUrl: null,
            assetKey: null,
            outputText: null,
            error: null,
            predictionId: null,
            run: null,
          },
        },
      ],
    }))
  },

  addEffectNode: (effectId, position) => {
    const effect = getEffect(effectId)
    if (!effect) return
    set((s) => ({
      nodes: [
        ...s.nodes,
        {
          id: nextId(),
          type: 'effect',
          position,
          data: {
            effectId,
            params: defaultEffectParams(effect),
            status: 'idle',
            assetKey: null,
            error: null,
          },
        },
      ],
    }))
  },

  applyTemplate: (templateId, position) => {
    const template = getTemplate(templateId)
    if (!template) return

    const ids = template.steps.map(() => nextId())
    const nodes = template.steps.map((step, i) => {
      const at = { x: position.x + step.dx, y: position.y + step.dy }
      if (step.type === 'prompt') {
        return {
          id: ids[i],
          type: 'prompt',
          position: at,
          ...PROMPT_SIZE,
          data: { text: step.text },
        } as AppNode
      }
      if (step.type === 'image') {
        return {
          id: ids[i],
          type: 'image',
          position: at,
          data: { assetKey: null, url: '', name: '' },
        } as AppNode
      }
      return {
        id: ids[i],
        type: 'gen',
        position: at,
        data: {
          modelId: step.modelId,
          prompt: '',
          inputs: {},
          status: 'idle',
          outputUrl: null,
          assetKey: null,
          outputText: null,
          error: null,
          predictionId: null,
          run: null,
        },
      } as AppNode
    })

    const edges: Edge[] = template.edges.map(([from, to]) => ({
      id: `e${ids[from]}-${ids[to]}`,
      source: ids[from],
      target: ids[to],
      animated: true,
    }))

    set((s) => ({ nodes: [...s.nodes, ...nodes], edges: [...s.edges, ...edges] }))
  },

  exportShare: () => {
    const { title, nodes, edges } = get()
    return encodeShare(title, nodes, edges)
  },

  downloadProject: async (id) => {
    const live = get()
    let { title, nodes, edges } = live

    if (id && id !== live.projectId) {
      const stored = await loadProject(id)
      if (!stored) throw new Error('That project is no longer stored')
      ;({ title, nodes, edges } = stored)
    }

    const json = encodeShareFile(title, nodes, edges)
    const blob = new Blob([json], { type: 'application/json' })
    return saveToDisk(blob, shareFilename(title))
  },

  importShare: async (code) => {
    const shared = parseShare(code)

    const ids = shared.nodes.map(() => nextId())
    const nodes = shared.nodes.map((node, i) => {
      const base = { id: ids[i], position: { x: node.x, y: node.y } }
      if (node.type === 'prompt') {
        return { ...base, type: 'prompt', ...PROMPT_SIZE, data: { text: node.text } } as AppNode
      }
      if (node.type === 'image') {
        // Uploaded files are never in a share code, so only a URL can carry over.
        return {
          ...base,
          type: 'image',
          data: { assetKey: null, url: node.url, name: '' },
        } as AppNode
      }
      if (node.type === 'effect') {
        return {
          ...base,
          type: 'effect',
          data: {
            effectId: node.effectId,
            params: node.params,
            status: 'idle',
            assetKey: null,
            error: null,
          },
        } as AppNode
      }
      return {
        ...base,
        type: 'gen',
        data: {
          modelId: node.modelId,
          prompt: node.prompt,
          inputs: node.inputs,
          status: 'idle',
          outputUrl: null,
          assetKey: null,
          outputText: null,
          error: null,
          predictionId: null,
          run: null,
        },
      } as AppNode
    })

    const edges: Edge[] = shared.edges.map(([from, to]) => ({
      id: `e${ids[from]}-${ids[to]}`,
      source: ids[from],
      target: ids[to],
      animated: true,
    }))

    // Land in a new project so an import never overwrites open work.
    const id = newProjectId()
    const now = Date.now()
    await saveProject({
      id,
      title: shared.title,
      nodes,
      edges,
      createdAt: now,
      updatedAt: now,
    })
    await get().openProject(id)

    return { nodes: nodes.length, skipped: shared.skipped, title: shared.title }
  },

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AppNode) : n,
      ),
    })),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  duplicateNode: (id) =>
    set((s) => {
      const node = s.nodes.find((n) => n.id === id)
      if (!node) return s
      const copy = {
        ...node,
        id: nextId(),
        selected: false,
        position: { x: node.position.x + 48, y: node.position.y + 48 },
        data: { ...node.data },
      } as AppNode
      return { nodes: [...s.nodes, copy] }
    }),

  resolveUpstream: (id) => {
    const { nodes, edges, assetUrls } = get()

    const promptParts: string[] = []
    const sources: UpstreamMedia[] = []

    // Walked per edge, not per node, so the handle an edge landed on is known.
    for (const edge of edges.filter((e) => e.target === id)) {
      const node = nodes.find((n) => n.id === edge.source)
      if (!node) continue
      // 'in' is the node's generic input, which means "wherever this fits".
      const handle = edge.targetHandle && edge.targetHandle !== 'in' ? edge.targetHandle : null

      if (node.type === 'prompt') {
        const text = (node.data as PromptNodeData).text
        if (text) promptParts.push(text)
        continue
      }

      if (node.type === 'image') {
        const data = node.data as ImageNodeData
        // An uploaded file lives only as a blob; materializeMedia turns the
        // blob URL into a data URI before Replicate sees it.
        const url = data.assetKey ? (assetUrls[data.assetKey] ?? '') : data.url
        if (url || data.assetKey) {
          sources.push({ kind: 'image', url, assetKey: data.assetKey ?? undefined, handle })
        }
        continue
      }

      if (node.type === 'effect') {
        // Effect output only exists locally, as a blob.
        const data = node.data as EffectNodeData
        if (data.assetKey) {
          sources.push({
            kind: 'image',
            url: assetUrls[data.assetKey] ?? '',
            assetKey: data.assetKey,
            handle,
          })
        }
        continue
      }

      const data = node.data as GenNodeData
      const kind = getModel(data.modelId)?.outputKind
      if (kind === 'text') {
        if (data.outputText) promptParts.push(data.outputText)
      } else if (kind === 'image' || kind === 'video' || kind === 'audio') {
        // Replicate has to fetch the file itself, so prefer the remote URL — the
        // local blob copy is for display, for effects, and once the URL expires.
        const url = data.outputUrl ?? (data.assetKey ? (assetUrls[data.assetKey] ?? '') : '')
        if (url || data.assetKey) {
          sources.push({ kind, url, assetKey: data.assetKey ?? undefined, handle })
        }
      }
    }

    // The one-per-kind maps stay for consumers that only need a single file.
    const media: Partial<Record<MediaKind, string>> = {}
    const mediaAssets: Partial<Record<MediaKind, string>> = {}
    for (const source of sources) {
      if (source.url && !media[source.kind]) media[source.kind] = source.url
      if (source.assetKey && !mediaAssets[source.kind]) mediaAssets[source.kind] = source.assetKey
    }

    return { prompt: promptParts.join('\n'), media, mediaAssets, sources }
  },
}))

// ---- Theme ----------------------------------------------------------------

applyTheme(useStore.getState().resolvedTheme)

// Only follows the OS while the preference is 'system'.
lightQuery.addEventListener('change', () => {
  if (useStore.getState().theme !== 'system') return
  const resolvedTheme = resolveTheme('system')
  applyTheme(resolvedTheme)
  useStore.setState({ resolvedTheme })
})

function revokeAssetUrls(urls: Record<string, string>) {
  for (const url of Object.values(urls)) URL.revokeObjectURL(url)
}

async function hydrateAssets(nodes: AppNode[], set: (partial: Partial<State>) => void) {
  const keys = nodes
    .map((n) => (n.type === 'prompt' ? null : (n.data as { assetKey: string | null }).assetKey))
    .filter(Boolean) as string[]

  const entries = await Promise.all(
    keys.map(async (key) => {
      const blob = await getAsset(key)
      return blob ? ([key, URL.createObjectURL(blob)] as const) : null
    }),
  )

  const urls = Object.fromEntries(entries.filter(Boolean) as (readonly [string, string])[])
  if (Object.keys(urls).length) set({ assetUrls: urls })
}

// ---- Autosave -------------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | undefined

useStore.subscribe((state, prev) => {
  if (hydrating || !state.projectId) return
  const changed =
    state.nodes !== prev.nodes || state.edges !== prev.edges || state.title !== prev.title
  if (!changed) return

  clearTimeout(saveTimer)
  useStore.setState({ saving: true })
  saveTimer = setTimeout(async () => {
    const { projectId, title, nodes, edges } = useStore.getState()
    const existing = await loadProject(projectId)
    await saveProject({
      id: projectId,
      title,
      nodes,
      edges,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    })
    useStore.setState({ saving: false })
    useStore.getState().refreshProjects()
  }, 600)
})
