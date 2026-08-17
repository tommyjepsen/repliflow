/**
 * Starting prompts for the prompt node.
 *
 * Each one is written to work on its own: subject, lighting, lens and finish, so
 * it produces something usable before a single word is edited. Keep them generic
 * enough to swap the subject out — that is the first thing anyone does.
 */

export type PromptGroup = 'Photography' | 'Illustration' | 'Motion'

export type PromptPreset = {
  id: string
  name: string
  group: PromptGroup
  text: string
}

export const PROMPT_GROUPS: PromptGroup[] = ['Photography', 'Illustration', 'Motion']

export const PROMPT_PRESETS: PromptPreset[] = [
  // ── Photography ──
  {
    id: 'nordic-office-portrait',
    name: 'Scandinavian office portrait',
    group: 'Photography',
    text: 'Realistic corporate portrait of a Scandinavian woman in her early thirties, office casual — light knit over a white shirt, no tie. Standing by a large window in a bright minimal office, soft overcast daylight, shallow depth of field with the desks blurred behind her. Relaxed, natural half-smile, looking just off camera. Shot on an 85mm lens at f/2, neutral colour grade, subtle skin texture, no retouching gloss.',
  },
  {
    id: 'gritty-sport',
    name: 'Gritty sports close-up',
    group: 'Photography',
    text: 'Up close, high-grain action photo of a cyclist mid-sprint, cropped tight on the shoulder and handlebars. Harsh side light, sweat and road dust catching the sun, motion blur in the background from a panning shot at 1/40s. Pushed film look — heavy grain, crushed blacks, slightly blown highlights, muted desaturated colour. Shot on a 35mm lens, handheld, imperfect framing.',
  },
  {
    id: 'golden-hour-street',
    name: 'Golden-hour street candid',
    group: 'Photography',
    text: 'Candid street photograph at golden hour, a person walking through long shadows on a city pavement, backlit by low sun with warm lens flare. Unposed, caught mid-stride, ordinary clothing. 35mm film aesthetic — fine grain, gentle halation around highlights, warm amber cast, natural contrast. Documentary framing with room around the subject.',
  },
  {
    id: 'studio-product',
    name: 'Studio product shot',
    group: 'Photography',
    text: 'Clean studio product photograph of a single object centred on a seamless light grey backdrop. Large softbox from the upper left, subtle fill from the right, one soft contact shadow beneath the object. Crisp edge definition, accurate colour, no reflections or props competing with the subject. Shot on a 100mm macro lens at f/8, tack sharp front to back, generous negative space for layout.',
  },
  {
    id: 'moody-food',
    name: 'Moody food overhead',
    group: 'Photography',
    text: 'Overhead food photograph on a dark weathered surface, single dish slightly off centre, scattered ingredients and crumbs for authenticity. Hard directional window light from the right, deep falloff into shadow, steam catching the light. Rich saturated tones against near-black surroundings, visible texture in the ceramic and linen. Shot on a 50mm lens at f/2.8.',
  },
  {
    id: 'architectural-interior',
    name: 'Architectural interior',
    group: 'Photography',
    text: 'Architectural interior photograph of a quiet minimal room — pale oak floor, plaster walls, one large window. Late afternoon daylight raking across the wall, no artificial lights on. Straight verticals, symmetrical composition, wide 24mm lens, everything in focus. Restrained neutral palette, natural shadows, no people, magazine-quality finish.',
  },
  {
    id: 'aerial-landscape',
    name: 'Cinematic aerial landscape',
    group: 'Photography',
    text: 'Cinematic aerial photograph of a coastline at dawn, low mist sitting over the water, long shadows from the rising sun. Drone perspective looking down at a slight angle, strong graphic lines where land meets sea. Cool blue shadows against warm highlights, subtle atmospheric haze, wide dynamic range, colour graded like a feature film still.',
  },
  {
    id: 'analog-flash',
    name: '90s analog flash snapshot',
    group: 'Photography',
    text: 'Amateur 1990s point-and-shoot snapshot with harsh on-camera flash. Subject caught slightly off guard indoors at night, hard shadow on the wall behind, hot falloff into darkness at the edges. Slightly green-magenta colour cast, visible grain, mild lens softness, date stamp in the lower right corner. Casual, imperfect, unmistakably shot on film.',
  },
  {
    id: 'macro-texture',
    name: 'Macro texture detail',
    group: 'Photography',
    text: 'Extreme macro photograph of a surface texture filling the whole frame — fibres, grain and tiny imperfections clearly resolved. Raking light from one side to exaggerate relief, gentle falloff into shadow. Shot at 1:1 magnification on a macro lens, razor-thin focus plane with soft bokeh either side, muted natural colour.',
  },

  // ── Illustration ──
  {
    id: 'flat-vector',
    name: 'Flat vector illustration',
    group: 'Illustration',
    text: 'Flat vector illustration, geometric shapes and clean confident lines, limited palette of three colours plus off-white. Subject simplified to its essentials, no gradients, no drop shadows, generous flat background. Balanced composition with clear silhouettes, editorial style suitable for a landing page hero.',
  },
  {
    id: 'isometric-render',
    name: 'Isometric 3D render',
    group: 'Illustration',
    text: 'Isometric 3D render of a small scene on a plain pastel background, floating slightly with a soft ambient shadow underneath. Matte clay materials, rounded edges, soft global illumination with one gentle key light. Muted friendly palette, no text, clean silhouette, rendered at high sample count with subtle ambient occlusion.',
  },
  {
    id: 'ink-editorial',
    name: 'Ink editorial drawing',
    group: 'Illustration',
    text: 'Editorial ink drawing, confident hand-inked linework with cross-hatching for shadow, single spot colour used sparingly for emphasis. Off-white paper texture visible, slight bleed where the pen sat too long. Conceptual and a little wry, the kind of drawing that runs beside a long-form article.',
  },

  // ── Motion ──
  {
    id: 'slow-dolly-in',
    name: 'Slow dolly-in',
    group: 'Motion',
    text: 'Slow dolly-in on the subject, camera gliding forward at a steady pace with the background compressing behind it. Shallow depth of field holding focus on the subject throughout, soft natural light, dust motes drifting through the beam. Calm and deliberate pacing, no cuts, subtle handheld weight to the movement.',
  },
  {
    id: 'orbit-reveal',
    name: 'Orbiting reveal',
    group: 'Motion',
    text: 'Camera orbits slowly around the subject at eye level, revealing it from a new angle as the light shifts across its surface. Smooth constant speed, subject centred and stable, background falling gently out of focus. Cinematic colour grade, gentle highlight roll-off, one continuous take.',
  },
  {
    id: 'handheld-follow',
    name: 'Handheld follow shot',
    group: 'Motion',
    text: 'Handheld follow shot from just behind the subject as they move forward, camera bobbing naturally with each step. Available light only, lens flare when it catches the sun, background streaking past with motion blur. Documentary energy, slight focus hunting, unpolished and immediate.',
  },
]

export function presetsIn(group: PromptGroup) {
  return PROMPT_PRESETS.filter((p) => p.group === group)
}
