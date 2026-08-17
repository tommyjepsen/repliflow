/**
 * Starter graphs offered on an empty canvas. Each one lays out a few nodes and
 * the edges between them, positioned relative to a drop point.
 */

export type TemplateId =
  | 'prompt-to-image'
  | 'prompt-to-video'
  | 'image-to-transparent'
  | 'image-to-image'
  | 'image-to-video'
  | 'cheap-video-test'

export type TemplateStep =
  | { type: 'prompt'; text: string; dx: number; dy: number }
  | { type: 'image'; dx: number; dy: number }
  | { type: 'model'; modelId: string; dx: number; dy: number }

export type Template = {
  id: TemplateId
  name: string
  description: string
  steps: TemplateStep[]
  /** Pairs of step indices to connect, source first. */
  edges: [number, number][]
}

const COLUMN = 360

export const TEMPLATES: Template[] = [
  {
    id: 'prompt-to-image',
    name: 'Prompt → Image',
    description: 'A prompt node feeding Flux 1.1 Pro.',
    steps: [
      { type: 'prompt', text: '', dx: 0, dy: 0 },
      { type: 'model', modelId: 'black-forest-labs/flux-1.1-pro', dx: COLUMN, dy: 0 },
    ],
    edges: [[0, 1]],
  },
  {
    id: 'prompt-to-video',
    name: 'Prompt → Video',
    description: 'A prompt node feeding Veo 3 Fast.',
    steps: [
      { type: 'prompt', text: '', dx: 0, dy: 0 },
      { type: 'model', modelId: 'google/veo-3-fast', dx: COLUMN, dy: 0 },
    ],
    edges: [[0, 1]],
  },
  {
    id: 'image-to-image',
    name: 'Image → Image',
    description: 'Start from your own image and edit it with Flux Kontext Pro.',
    steps: [
      { type: 'image', dx: 0, dy: 0 },
      { type: 'prompt', text: '', dx: 0, dy: 360 },
      { type: 'model', modelId: 'black-forest-labs/flux-kontext-pro', dx: COLUMN, dy: 60 },
    ],
    edges: [
      [0, 2],
      [1, 2],
    ],
  },
  {
    id: 'image-to-video',
    name: 'Image → Video',
    description: 'Animate your own image with Kling v2.5 Turbo Pro.',
    steps: [
      { type: 'image', dx: 0, dy: 0 },
      { type: 'prompt', text: '', dx: 0, dy: 360 },
      { type: 'model', modelId: 'kwaivgi/kling-v2.5-turbo-pro', dx: COLUMN, dy: 60 },
    ],
    edges: [
      [0, 2],
      [1, 2],
    ],
  },
  {
    id: 'cheap-video-test',
    name: 'Cheap video test',
    description: 'Iterate on prompts with Wan 2.5 T2V Fast before paying for Veo or Sora.',
    steps: [
      { type: 'prompt', text: '', dx: 0, dy: 0 },
      { type: 'model', modelId: 'wan-video/wan-2.5-t2v-fast', dx: COLUMN, dy: 0 },
    ],
    edges: [[0, 1]],
  },
  {
    id: 'image-to-transparent',
    name: 'Image → Transparent BG',
    description: 'Generate an image, then cut the background out of it.',
    steps: [
      { type: 'prompt', text: '', dx: 0, dy: 0 },
      { type: 'model', modelId: 'black-forest-labs/flux-1.1-pro', dx: COLUMN, dy: 0 },
      { type: 'model', modelId: '851-labs/background-remover', dx: COLUMN * 2, dy: 0 },
    ],
    edges: [
      [0, 1],
      [1, 2],
    ],
  },
]

export function getTemplate(id: TemplateId) {
  return TEMPLATES.find((t) => t.id === id)
}
