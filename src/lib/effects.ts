/**
 * Client-side image effects. These are deterministic pixel transforms, so they
 * run locally on a canvas rather than as Replicate predictions — instant, free,
 * and repeatable. Reading pixels requires a same-origin image, which is why the
 * effect node works from the cached blob rather than the delivery URL.
 */

export type EffectParam =
  | { key: string; label: string; type: 'number'; default: number; min: number; max: number; step?: number }
  | { key: string; label: string; type: 'enum'; default: string; options: string[] }
  | { key: string; label: string; type: 'color'; default: string }
  | { key: string; label: string; type: 'boolean'; default: boolean }

export type EffectParams = Record<string, string | number | boolean>

export type EffectDef = {
  id: string
  name: string
  description: string
  params: EffectParam[]
  apply: (image: ImageBitmap, params: EffectParams, canvas: HTMLCanvasElement) => void
}

const TAU = Math.PI * 2

const num = (p: EffectParams, k: string, fallback: number) =>
  typeof p[k] === 'number' ? (p[k] as number) : fallback
const str = (p: EffectParams, k: string, fallback: string) =>
  typeof p[k] === 'string' ? (p[k] as string) : fallback
const bool = (p: EffectParams, k: string, fallback: boolean) =>
  typeof p[k] === 'boolean' ? (p[k] as boolean) : fallback

function context(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  return ctx
}

/** Draws the source image and returns its pixel buffer. */
function readPixels(image: ImageBitmap) {
  const scratch = document.createElement('canvas')
  const ctx = context(scratch, image.width, image.height)
  ctx.drawImage(image, 0, 0)
  return ctx.getImageData(0, 0, image.width, image.height)
}

const luminance = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const value = Number.parseInt(full, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** Mean luminance and colour of a box centred on (cx, cy). */
function sampleCell(data: ImageData, cx: number, cy: number, size: number) {
  const half = Math.max(1, size / 2)
  const x0 = Math.max(0, Math.floor(cx - half))
  const x1 = Math.min(data.width - 1, Math.ceil(cx + half))
  const y0 = Math.max(0, Math.floor(cy - half))
  const y1 = Math.min(data.height - 1, Math.ceil(cy + half))

  let r = 0
  let g = 0
  let b = 0
  let a = 0
  let count = 0

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * data.width + x) * 4
      r += data.data[i]
      g += data.data[i + 1]
      b += data.data[i + 2]
      a += data.data[i + 3]
      count++
    }
  }

  if (!count) return { lum: 1, r: 255, g: 255, b: 255, alpha: 0 }
  return {
    lum: luminance(r / count, g / count, b / count),
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
    alpha: a / count / 255,
  }
}

const ASCII_RAMPS: Record<string, string> = {
  standard: '@%#*+=-:. ',
  blocks: '█▓▒░ ',
  minimal: '@Oo. ',
  binary: '01 ',
  dots: '⣿⣷⣯⣟⡿⢿⠿⠟⠋⠁ ',
}

export const EFFECTS: EffectDef[] = [
  {
    id: 'halftone',
    name: 'Halftone',
    description: 'Dot screen, like newsprint.',
    params: [
      { key: 'dotSize', label: 'Dot size', type: 'number', default: 8, min: 2, max: 40, step: 1 },
      { key: 'angle', label: 'Screen angle', type: 'number', default: 45, min: 0, max: 90, step: 5 },
      { key: 'mode', label: 'Colour', type: 'enum', default: 'mono', options: ['mono', 'sampled'] },
      { key: 'dot', label: 'Dot colour', type: 'color', default: '#000000' },
      { key: 'background', label: 'Background', type: 'color', default: '#ffffff' },
      { key: 'transparent', label: 'Transparent background', type: 'boolean', default: false },
    ],
    apply(image, params, canvas) {
      const pixels = readPixels(image)
      const { width, height } = image
      const ctx = context(canvas, width, height)

      const spacing = num(params, 'dotSize', 8)
      const angle = (num(params, 'angle', 45) * Math.PI) / 180
      const sampled = str(params, 'mode', 'mono') === 'sampled'
      const dot = str(params, 'dot', '#000000')

      if (!bool(params, 'transparent', false)) {
        ctx.fillStyle = str(params, 'background', '#ffffff')
        ctx.fillRect(0, 0, width, height)
      }
      ctx.fillStyle = dot

      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const reach = Math.hypot(width, height)
      const maxRadius = spacing * 0.72

      // Walk a rotated lattice so the dot grid sits at the chosen screen angle.
      for (let gy = -reach; gy < reach; gy += spacing) {
        for (let gx = -reach; gx < reach; gx += spacing) {
          const x = cos * gx - sin * gy + width / 2
          const y = sin * gx + cos * gy + height / 2
          if (x < 0 || x >= width || y < 0 || y >= height) continue

          const cell = sampleCell(pixels, x, y, spacing)
          if (cell.alpha < 0.1) continue

          const radius = (1 - cell.lum) * maxRadius * cell.alpha
          if (radius < 0.2) continue

          if (sampled) ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, TAU)
          ctx.fill()
        }
      }
      if (sampled) ctx.fillStyle = dot
    },
  },

  {
    id: 'ascii',
    name: 'ASCII',
    description: 'Rebuild the image out of characters.',
    params: [
      { key: 'columns', label: 'Columns', type: 'number', default: 100, min: 20, max: 400, step: 10 },
      {
        key: 'ramp',
        label: 'Character set',
        type: 'enum',
        default: 'standard',
        options: Object.keys(ASCII_RAMPS),
      },
      { key: 'mode', label: 'Colour', type: 'enum', default: 'mono', options: ['mono', 'sampled'] },
      { key: 'ink', label: 'Text colour', type: 'color', default: '#e6e6e6' },
      { key: 'background', label: 'Background', type: 'color', default: '#0a0a0a' },
      { key: 'invert', label: 'Invert', type: 'boolean', default: false },
    ],
    apply(image, params, canvas) {
      const pixels = readPixels(image)
      const { width, height } = image
      const ctx = context(canvas, width, height)

      const columns = Math.max(8, Math.round(num(params, 'columns', 100)))
      const ramp = ASCII_RAMPS[str(params, 'ramp', 'standard')] ?? ASCII_RAMPS.standard
      const sampled = str(params, 'mode', 'mono') === 'sampled'
      const invert = bool(params, 'invert', false)

      // Monospace glyphs are roughly 0.6 as wide as they are tall.
      const cellWidth = width / columns
      const cellHeight = cellWidth / 0.6
      const rows = Math.max(1, Math.floor(height / cellHeight))

      ctx.fillStyle = str(params, 'background', '#0a0a0a')
      ctx.fillRect(0, 0, width, height)

      ctx.font = `${cellHeight}px ui-monospace, "SF Mono", Menlo, monospace`
      ctx.textBaseline = 'top'
      ctx.fillStyle = str(params, 'ink', '#e6e6e6')

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const cx = (col + 0.5) * cellWidth
          const cy = (row + 0.5) * cellHeight
          const cell = sampleCell(pixels, cx, cy, Math.max(cellWidth, 1))
          if (cell.alpha < 0.1) continue

          const lum = invert ? 1 - cell.lum : cell.lum
          const index = Math.min(ramp.length - 1, Math.floor(lum * ramp.length))
          const char = ramp[index]
          if (char === ' ') continue

          if (sampled) ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
          ctx.fillText(char, col * cellWidth, row * cellHeight)
        }
      }
    },
  },

  {
    id: 'dither',
    name: 'Dither',
    description: 'Reduce to few tones with error diffusion.',
    params: [
      { key: 'levels', label: 'Levels', type: 'number', default: 2, min: 2, max: 8, step: 1 },
      {
        key: 'algorithm',
        label: 'Algorithm',
        type: 'enum',
        default: 'floyd-steinberg',
        options: ['floyd-steinberg', 'ordered'],
      },
      { key: 'colour', label: 'Keep colour', type: 'boolean', default: false },
    ],
    apply(image, params, canvas) {
      const pixels = readPixels(image)
      const { width, height } = image
      const ctx = context(canvas, width, height)
      const data = pixels.data

      const levels = Math.max(2, Math.round(num(params, 'levels', 2)))
      const step = 255 / (levels - 1)
      const ordered = str(params, 'algorithm', 'floyd-steinberg') === 'ordered'
      const keepColour = bool(params, 'colour', false)

      const BAYER = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5],
      ]

      const channels = keepColour ? 3 : 1
      // Work on a float buffer so diffused error does not clip prematurely.
      const buffer = new Float32Array(width * height * channels)
      for (let i = 0, p = 0; i < data.length; i += 4) {
        if (keepColour) {
          buffer[p++] = data[i]
          buffer[p++] = data[i + 1]
          buffer[p++] = data[i + 2]
        } else {
          buffer[p++] = luminance(data[i], data[i + 1], data[i + 2]) * 255
        }
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let c = 0; c < channels; c++) {
            const index = (y * width + x) * channels + c
            let value = buffer[index]

            if (ordered) {
              value += (BAYER[y % 4][x % 4] / 16 - 0.5) * step
            }

            const quantized = Math.max(0, Math.min(255, Math.round(value / step) * step))

            if (!ordered) {
              const error = value - quantized
              const spread = (dx: number, dy: number, weight: number) => {
                const nx = x + dx
                const ny = y + dy
                if (nx < 0 || nx >= width || ny >= height) return
                buffer[(ny * width + nx) * channels + c] += error * weight
              }
              spread(1, 0, 7 / 16)
              spread(-1, 1, 3 / 16)
              spread(0, 1, 5 / 16)
              spread(1, 1, 1 / 16)
            }

            buffer[index] = quantized
          }
        }
      }

      for (let i = 0, p = 0; i < data.length; i += 4) {
        if (keepColour) {
          data[i] = buffer[p++]
          data[i + 1] = buffer[p++]
          data[i + 2] = buffer[p++]
        } else {
          const v = buffer[p++]
          data[i] = v
          data[i + 1] = v
          data[i + 2] = v
        }
      }

      ctx.putImageData(pixels, 0, 0)
    },
  },

  {
    id: 'pixelate',
    name: 'Pixelate',
    description: 'Snap to a coarse pixel grid.',
    params: [
      { key: 'size', label: 'Block size', type: 'number', default: 12, min: 2, max: 64, step: 1 },
    ],
    apply(image, params, canvas) {
      const { width, height } = image
      const ctx = context(canvas, width, height)
      const size = Math.max(2, Math.round(num(params, 'size', 12)))

      const smallW = Math.max(1, Math.round(width / size))
      const smallH = Math.max(1, Math.round(height / size))

      const small = document.createElement('canvas')
      const smallCtx = context(small, smallW, smallH)
      smallCtx.drawImage(image, 0, 0, smallW, smallH)

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(small, 0, 0, smallW, smallH, 0, 0, width, height)
    },
  },

  {
    id: 'posterize',
    name: 'Posterize',
    description: 'Flatten to a handful of tones per channel.',
    params: [
      { key: 'levels', label: 'Levels', type: 'number', default: 4, min: 2, max: 12, step: 1 },
      { key: 'saturation', label: 'Saturation', type: 'number', default: 1, min: 0, max: 2, step: 0.1 },
    ],
    apply(image, params, canvas) {
      const pixels = readPixels(image)
      const ctx = context(canvas, image.width, image.height)
      const data = pixels.data

      const levels = Math.max(2, Math.round(num(params, 'levels', 4)))
      const step = 255 / (levels - 1)
      const saturation = num(params, 'saturation', 1)

      for (let i = 0; i < data.length; i += 4) {
        const grey = luminance(data[i], data[i + 1], data[i + 2]) * 255
        for (let c = 0; c < 3; c++) {
          const mixed = grey + (data[i + c] - grey) * saturation
          data[i + c] = Math.max(0, Math.min(255, Math.round(mixed / step) * step))
        }
      }

      ctx.putImageData(pixels, 0, 0)
    },
  },

  {
    id: 'duotone',
    name: 'Duotone',
    description: 'Map brightness onto two colours.',
    params: [
      { key: 'shadow', label: 'Shadows', type: 'color', default: '#1b1035' },
      { key: 'highlight', label: 'Highlights', type: 'color', default: '#f5d16a' },
      { key: 'contrast', label: 'Contrast', type: 'number', default: 1, min: 0.2, max: 3, step: 0.1 },
    ],
    apply(image, params, canvas) {
      const pixels = readPixels(image)
      const ctx = context(canvas, image.width, image.height)
      const data = pixels.data

      const shadow = hexToRgb(str(params, 'shadow', '#1b1035'))
      const highlight = hexToRgb(str(params, 'highlight', '#f5d16a'))
      const contrast = num(params, 'contrast', 1)

      for (let i = 0; i < data.length; i += 4) {
        let t = luminance(data[i], data[i + 1], data[i + 2])
        t = Math.max(0, Math.min(1, (t - 0.5) * contrast + 0.5))
        for (let c = 0; c < 3; c++) {
          data[i + c] = shadow[c] + (highlight[c] - shadow[c]) * t
        }
      }

      ctx.putImageData(pixels, 0, 0)
    },
  },

  {
    id: 'scanlines',
    name: 'Scanlines',
    description: 'CRT lines with an optional colour shift.',
    params: [
      { key: 'spacing', label: 'Line spacing', type: 'number', default: 4, min: 2, max: 24, step: 1 },
      { key: 'strength', label: 'Strength', type: 'number', default: 0.5, min: 0, max: 1, step: 0.05 },
      { key: 'shift', label: 'Colour shift', type: 'number', default: 2, min: 0, max: 20, step: 1 },
    ],
    apply(image, params, canvas) {
      const { width, height } = image
      const source = readPixels(image)
      const ctx = context(canvas, width, height)
      const shift = Math.round(num(params, 'shift', 2))

      const out = ctx.createImageData(width, height)
      // Sample red from the left and blue from the right of each pixel, which
      // is what chromatic aberration actually looks like.
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const rx = Math.max(0, Math.min(width - 1, x - shift))
          const bx = Math.max(0, Math.min(width - 1, x + shift))
          out.data[i] = source.data[(y * width + rx) * 4]
          out.data[i + 1] = source.data[i + 1]
          out.data[i + 2] = source.data[(y * width + bx) * 4 + 2]
          out.data[i + 3] = source.data[i + 3]
        }
      }
      ctx.putImageData(out, 0, 0)

      const spacing = Math.max(2, Math.round(num(params, 'spacing', 4)))
      const strength = num(params, 'strength', 0.5)
      ctx.fillStyle = `rgba(0,0,0,${strength})`
      for (let y = 0; y < height; y += spacing) {
        ctx.fillRect(0, y, width, Math.max(1, Math.floor(spacing / 2)))
      }
    },
  },
]

export function getEffect(id: string) {
  return EFFECTS.find((e) => e.id === id)
}

export function defaultEffectParams(effect: EffectDef): EffectParams {
  return Object.fromEntries(effect.params.map((p) => [p.key, p.default]))
}

/** Runs an effect and returns the result as a PNG blob. */
export async function runEffect(
  effectId: string,
  params: EffectParams,
  source: Blob,
): Promise<Blob> {
  const effect = getEffect(effectId)
  if (!effect) throw new Error(`Unknown effect: ${effectId}`)

  const image = await createImageBitmap(source)
  try {
    const canvas = document.createElement('canvas')
    effect.apply(image, params, canvas)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the result'))),
        'image/png',
      )
    })
  } finally {
    image.close()
  }
}
