/**
 * Curated slice of Replicate's catalog.
 *
 * Deliberately no input field definitions here — those are fetched from each
 * model's OpenAPI schema at runtime (see `lib/schema.ts`), so a new entry only
 * needs its slug, where it belongs in the menu, and what it produces.
 */

export type OutputKind = 'image' | 'video' | 'audio' | 'model3d' | 'text'
export type MediaKind = 'image' | 'video' | 'audio'

export type Category = 'Image' | 'Video' | 'Audio' | '3D' | 'Utility'

export type ModelDef = {
  /** Replicate slug, e.g. `black-forest-labs/flux-schnell`. */
  id: string
  name: string
  category: Category
  /** Submenu the model appears under. */
  group: string
  outputKind: OutputKind
  /** Media this model consumes from upstream nodes, in priority order. */
  accepts?: MediaKind[]
  note?: string
}

const M = (
  id: string,
  name: string,
  category: Category,
  group: string,
  outputKind: OutputKind,
  accepts?: MediaKind[],
  note?: string,
): ModelDef => ({ id, name, category, group, outputKind, accepts, note })

export const MODELS: ModelDef[] = [
  // ══════════════════════════ IMAGE ══════════════════════════
  // — Generate from text —
  M('google/nano-banana-pro', 'Nano Banana Pro', 'Image', 'Generate from text', 'image', undefined, 'Gemini 3 Pro reasoning, 4K output'),
  M('google/nano-banana-2', 'Nano Banana 2', 'Image', 'Generate from text', 'image', undefined, 'Fast, strong text rendering'),
  M('openai/gpt-image-1.5', 'GPT Image 1.5', 'Image', 'Generate from text', 'image', ['image'], 'Accurate prompt following, readable text'),
  M('black-forest-labs/flux-2-max', 'Flux 2 Max', 'Image', 'Generate from text', 'image', ['image'], 'Highest fidelity FLUX'),
  M('black-forest-labs/flux-2-pro', 'Flux 2 Pro', 'Image', 'Generate from text', 'image', ['image'], 'Max quality at lower cost'),
  M('black-forest-labs/flux-2-flex', 'Flux 2 Flex', 'Image', 'Generate from text', 'image', ['image'], 'Typography and complex layouts'),
  M('black-forest-labs/flux-1.1-pro-ultra', 'Flux 1.1 Pro Ultra', 'Image', 'Generate from text', 'image', undefined, 'Up to 4 megapixels, raw mode'),
  M('black-forest-labs/flux-1.1-pro', 'Flux 1.1 Pro', 'Image', 'Generate from text', 'image'),
  M('black-forest-labs/flux-dev', 'Flux Dev', 'Image', 'Generate from text', 'image', undefined, '12B rectified flow transformer'),
  M('black-forest-labs/flux-schnell', 'Flux Schnell', 'Image', 'Generate from text', 'image', undefined, 'Fast, built for prototyping'),
  M('bytedance/seedream-4.5', 'Seedream 4.5', 'Image', 'Generate from text', 'image', ['image'], 'Cinematic, up to 4K'),
  M('bytedance/seedream-4', 'Seedream 4', 'Image', 'Generate from text', 'image', ['image']),
  M('google/imagen-4-ultra', 'Imagen 4 Ultra', 'Image', 'Generate from text', 'image', undefined, 'Quality over speed'),
  M('google/imagen-4', 'Imagen 4', 'Image', 'Generate from text', 'image'),
  M('google/imagen-4-fast', 'Imagen 4 Fast', 'Image', 'Generate from text', 'image'),
  M('xai/grok-imagine-image', 'Grok Imagine', 'Image', 'Generate from text', 'image', undefined, 'Cinematic, moody aesthetic'),
  M('ideogram-ai/ideogram-v3-quality', 'Ideogram V3 Quality', 'Image', 'Generate from text', 'image', ['image']),
  M('ideogram-ai/ideogram-v3-balanced', 'Ideogram V3 Balanced', 'Image', 'Generate from text', 'image', ['image']),
  M('ideogram-ai/ideogram-v3-turbo', 'Ideogram V3 Turbo', 'Image', 'Generate from text', 'image', ['image'], 'Graphic design, precise text'),
  M('recraft-ai/recraft-v4', 'Recraft V4', 'Image', 'Generate from text', 'image', undefined, 'Design-first composition'),
  M('recraft-ai/recraft-v4-pro', 'Recraft V4 Pro', 'Image', 'Generate from text', 'image', undefined, '2048px, print-ready'),
  M('recraft-ai/recraft-v3', 'Recraft V3', 'Image', 'Generate from text', 'image'),
  M('qwen/qwen-image', 'Qwen Image', 'Image', 'Generate from text', 'image', undefined, 'Complex text rendering'),
  M('stability-ai/stable-diffusion-3.5-large', 'Stable Diffusion 3.5 Large', 'Image', 'Generate from text', 'image'),
  M('stability-ai/stable-diffusion-3.5-medium', 'Stable Diffusion 3.5 Medium', 'Image', 'Generate from text', 'image'),
  M('luma/photon', 'Luma Photon', 'Image', 'Generate from text', 'image'),
  M('luma/photon-flash', 'Luma Photon Flash', 'Image', 'Generate from text', 'image'),
  M('minimax/image-01', 'Minimax Image 01', 'Image', 'Generate from text', 'image', ['image'], 'Character reference support'),
  M('leonardoai/lucid-origin', 'Lucid Origin', 'Image', 'Generate from text', 'image'),
  M('bria/image-3.2', 'Bria Image 3.2', 'Image', 'Generate from text', 'image', undefined, 'Licensed training data'),
  M('prunaai/z-image-turbo', 'Z-Image Turbo', 'Image', 'Generate from text', 'image', undefined, 'Super fast 6B model'),
  M('prunaai/p-image', 'P-Image', 'Image', 'Generate from text', 'image', undefined, 'Sub-second generation'),
  M('nvidia/sana', 'NVIDIA Sana', 'Image', 'Generate from text', 'image', undefined, 'Up to 4096×4096'),
  M('stability-ai/sdxl', 'SDXL', 'Image', 'Generate from text', 'image', ['image']),

  // — Vector graphics —
  M('recraft-ai/recraft-v4-svg', 'Recraft V4 SVG', 'Image', 'Generate vector graphics', 'image', undefined, 'Editable SVG output'),
  M('recraft-ai/recraft-v4-pro-svg', 'Recraft V4 Pro SVG', 'Image', 'Generate vector graphics', 'image', undefined, 'High-detail SVG'),
  M('recraft-ai/recraft-v3-svg', 'Recraft V3 SVG', 'Image', 'Generate vector graphics', 'image'),
  M('fofr/sticker-maker', 'Sticker Maker', 'Image', 'Generate vector graphics', 'image', undefined, 'Transparent backgrounds'),

  // — Edit images —
  M('google/nano-banana', 'Nano Banana', 'Image', 'Edit images', 'image', ['image'], 'Conversational editing'),
  M('black-forest-labs/flux-kontext-max', 'Flux Kontext Max', 'Image', 'Edit images', 'image', ['image'], 'Premium text-based editing'),
  M('black-forest-labs/flux-kontext-pro', 'Flux Kontext Pro', 'Image', 'Edit images', 'image', ['image']),
  M('black-forest-labs/flux-kontext-dev', 'Flux Kontext Dev', 'Image', 'Edit images', 'image', ['image'], 'Open weights'),
  M('black-forest-labs/flux-fill-pro', 'Flux Fill Pro', 'Image', 'Edit images', 'image', ['image'], 'Inpainting and outpainting'),
  M('qwen/qwen-image-edit-plus', 'Qwen Image Edit Plus', 'Image', 'Edit images', 'image', ['image'], 'Multi-image, ControlNet'),
  M('qwen/qwen-image-edit', 'Qwen Image Edit', 'Image', 'Edit images', 'image', ['image']),
  M('prunaai/p-image-edit', 'P-Image Edit', 'Image', 'Edit images', 'image', ['image'], 'Sub-second editing'),
  M('prunaai/flux-kontext-fast', 'Flux Kontext Fast', 'Image', 'Edit images', 'image', ['image']),
  M('bria/eraser', 'Bria Eraser', 'Image', 'Edit images', 'image', ['image'], 'Object removal'),
  M('bria/genfill', 'Bria GenFill', 'Image', 'Edit images', 'image', ['image'], 'Add or transform objects'),
  M('bria/expand-image', 'Bria Expand', 'Image', 'Edit images', 'image', ['image'], 'Expand beyond the borders'),
  M('bria/generate-background', 'Bria Background', 'Image', 'Edit images', 'image', ['image'], 'Swap the background'),
  M('flux-kontext-apps/multi-image-kontext-max', 'Multi-Image Kontext Max', 'Image', 'Edit images', 'image', ['image'], 'Combine two images'),
  M('flux-kontext-apps/restore-image', 'Kontext Restore', 'Image', 'Edit images', 'image', ['image'], 'Scratch repair, colorization'),
  M('fofr/color-matcher', 'Color Matcher', 'Image', 'Edit images', 'image', ['image'], 'Color match and white balance'),

  // — Upscale and restore —
  M('topazlabs/image-upscale', 'Topaz Image Upscale', 'Image', 'Upscale & restore', 'image', ['image'], 'Five specialized modes'),
  M('philz1337x/clarity-pro-upscaler', 'Clarity Pro Upscaler', 'Image', 'Upscale & restore', 'image', ['image'], 'Up to 16x, creativity control'),
  M('philz1337x/clarity-upscaler', 'Clarity Upscaler', 'Image', 'Upscale & restore', 'image', ['image'], 'Community favourite'),
  M('philz1337x/crystal-upscaler', 'Crystal Upscaler', 'Image', 'Upscale & restore', 'image', ['image'], 'Portrait and face focused'),
  M('recraft-ai/recraft-crisp-upscale', 'Recraft Crisp Upscale', 'Image', 'Upscale & restore', 'image', ['image'], 'No hallucinated detail'),
  M('recraft-ai/recraft-creative-upscale', 'Recraft Creative Upscale', 'Image', 'Upscale & restore', 'image', ['image']),
  M('google/upscaler', 'Google Upscaler', 'Image', 'Upscale & restore', 'image', ['image'], '2x or 4x, no config'),
  M('prunaai/p-image-upscale', 'P-Image Upscale', 'Image', 'Upscale & restore', 'image', ['image'], 'Sub-second, up to 128MP'),
  M('nightmareai/real-esrgan', 'Real-ESRGAN', 'Image', 'Upscale & restore', 'image', ['image'], 'Fast, optional face enhance'),
  M('bria/increase-resolution', 'Bria Increase Resolution', 'Image', 'Upscale & restore', 'image', ['image']),
  M('sczhou/codeformer', 'CodeFormer', 'Image', 'Upscale & restore', 'image', ['image'], 'Face restoration'),
  M('tencentarc/gfpgan', 'GFPGAN', 'Image', 'Upscale & restore', 'image', ['image'], 'Face restoration for old photos'),
  M('zsxkib/seedvr2', 'SeedVR2', 'Image', 'Upscale & restore', 'image', ['image'], 'One-step image and video restore'),

  // — Remove background —
  M('851-labs/background-remover', 'Background Remover', 'Image', 'Remove background', 'image', ['image']),
  M('bria/remove-background', 'Bria Remove Background', 'Image', 'Remove background', 'image', ['image']),
  M('men1scus/birefnet', 'BiRefNet', 'Image', 'Remove background', 'image', ['image'], 'High-resolution segmentation'),
  M('lucataco/remove-bg', 'Remove BG', 'Image', 'Remove background', 'image', ['image']),

  // ══════════════════════════ VIDEO ══════════════════════════
  // — Generate from text —
  M('bytedance/seedance-2.5', 'Seedance 2.5', 'Video', 'Generate from text', 'video', ['image'], 'Newest ByteDance model'),
  M('runwayml/gen-4.5', 'Runway Gen-4.5', 'Video', 'Generate from text', 'video', ['image'], '#1 on the text-to-video benchmark'),
  M('google/veo-3.1', 'Veo 3.1', 'Video', 'Generate from text', 'video', ['image'], 'Native audio generation'),
  M('google/veo-3.1-fast', 'Veo 3.1 Fast', 'Video', 'Generate from text', 'video', ['image']),
  M('google/veo-3.1-lite', 'Veo 3.1 Lite', 'Video', 'Generate from text', 'video', ['image'], 'Budget tier'),
  M('google/veo-3', 'Veo 3', 'Video', 'Generate from text', 'video', ['image']),
  M('google/veo-3-fast', 'Veo 3 Fast', 'Video', 'Generate from text', 'video', ['image']),
  M('openai/sora-2-pro', 'Sora 2 Pro', 'Video', 'Generate from text', 'video', ['image'], 'Synced audio'),
  M('openai/sora-2', 'Sora 2', 'Video', 'Generate from text', 'video', ['image']),
  M('kwaivgi/kling-v3-video', 'Kling v3', 'Video', 'Generate from text', 'video', ['image'], 'Up to 15s, multi-shot'),
  M('kwaivgi/kling-v2.5-turbo-pro', 'Kling v2.5 Turbo Pro', 'Video', 'Generate from text', 'video', ['image']),
  M('bytedance/seedance-2.0', 'Seedance 2.0', 'Video', 'Generate from text', 'video', ['image'], 'Up to 9 reference images'),
  M('bytedance/seedance-2.0-fast', 'Seedance 2.0 Fast', 'Video', 'Generate from text', 'video', ['image']),
  M('bytedance/seedance-1.5-pro', 'Seedance 1.5 Pro', 'Video', 'Generate from text', 'video', ['image'], 'Cinema quality, lip-sync'),
  M('bytedance/seedance-1-pro', 'Seedance 1 Pro', 'Video', 'Generate from text', 'video', ['image']),
  M('bytedance/seedance-1-lite', 'Seedance 1 Lite', 'Video', 'Generate from text', 'video', ['image']),
  M('xai/grok-imagine-video', 'Grok Imagine Video', 'Video', 'Generate from text', 'video', ['image'], 'Clips with audio in ~30s'),
  M('minimax/hailuo-2.3', 'Hailuo 2.3', 'Video', 'Generate from text', 'video', ['image']),
  M('minimax/hailuo-2.3-fast', 'Hailuo 2.3 Fast', 'Video', 'Generate from text', 'video', ['image']),
  M('minimax/hailuo-02', 'Hailuo 02', 'Video', 'Generate from text', 'video', ['image']),
  M('luma/ray-3.2', 'Luma Ray 3.2', 'Video', 'Generate from text', 'video', ['image'], 'HDR/EXR export'),
  M('wan-video/wan-2.7-t2v', 'Wan 2.7 T2V', 'Video', 'Generate from text', 'video', undefined, '27B MoE, open source'),
  M('wan-video/wan-2.5-t2v', 'Wan 2.5 T2V', 'Video', 'Generate from text', 'video'),
  M('wan-video/wan-2.5-t2v-fast', 'Wan 2.5 T2V Fast', 'Video', 'Generate from text', 'video'),
  M('pixverse/pixverse-v6', 'PixVerse v6', 'Video', 'Generate from text', 'video', ['image'], 'Camera control'),
  M('pixverse/pixverse-v5.6', 'PixVerse v5.6', 'Video', 'Generate from text', 'video', ['image']),
  M('prunaai/p-video', 'P-Video', 'Video', 'Generate from text', 'video', ['image'], '4× faster draft mode'),
  M('vidu/q3-pro', 'Vidu Q3 Pro', 'Video', 'Generate from text', 'video', ['image'], 'Start-end frame control'),
  M('vidu/q3-turbo', 'Vidu Q3 Turbo', 'Video', 'Generate from text', 'video', ['image']),
  M('leonardoai/motion-2.0', 'Leonardo Motion 2.0', 'Video', 'Generate from text', 'video', ['image']),
  M('lightricks/ltx-video', 'LTX Video', 'Video', 'Generate from text', 'video', ['image'], 'Real-time DiT model'),
  M('tencent/hunyuan-video', 'Hunyuan Video', 'Video', 'Generate from text', 'video'),

  // — Generate from image —
  M('kwaivgi/kling-v2.1', 'Kling v2.1', 'Video', 'Generate from image', 'video', ['image']),
  M('kwaivgi/kling-v2.1-master', 'Kling v2.1 Master', 'Video', 'Generate from image', 'video', ['image']),
  M('wan-video/wan-2.7-i2v', 'Wan 2.7 I2V', 'Video', 'Generate from image', 'video', ['image'], 'First and last frame control'),
  M('wan-video/wan-2.5-i2v', 'Wan 2.5 I2V', 'Video', 'Generate from image', 'video', ['image'], 'Synchronized audio'),
  M('wan-video/wan-2.5-i2v-fast', 'Wan 2.5 I2V Fast', 'Video', 'Generate from image', 'video', ['image']),
  M('wan-video/wan-2.2-i2v-fast', 'Wan 2.2 I2V Fast', 'Video', 'Generate from image', 'video', ['image'], 'Cheapest and fastest'),
  M('alibaba/happyhorse-1.1', 'HappyHorse 1.1', 'Video', 'Generate from image', 'video', ['image']),
  M('minimax/video-01-live', 'Video 01 Live', 'Video', 'Generate from image', 'video', ['image'], 'Live2D animation'),
  M('luma/ray-2-720p', 'Luma Ray 2 720p', 'Video', 'Generate from image', 'video', ['image']),
  M('luma/ray-flash-2-720p', 'Luma Ray Flash 2 720p', 'Video', 'Generate from image', 'video', ['image']),
  M('bytedance/dreamactor-m2.0', 'DreamActor M2.0', 'Video', 'Generate from image', 'video', ['image', 'video'], 'Animate a character from one image'),
  M('prunaai/p-video-animate', 'P-Video Animate', 'Video', 'Generate from image', 'video', ['image', 'video'], 'Motion transfer from a source video'),

  // — Edit video —
  M('kwaivgi/kling-v3-omni-video', 'Kling v3 Omni', 'Video', 'Edit video', 'video', ['video', 'image'], 'Natural-language video editing'),
  M('wan-video/wan-2.7-videoedit', 'Wan 2.7 Video Edit', 'Video', 'Edit video', 'video', ['video'], 'Text-instructed editing'),
  M('luma/modify-video', 'Luma Modify Video', 'Video', 'Edit video', 'video', ['video'], 'Style transfer, keeps structure'),
  M('luma/reframe-video', 'Luma Reframe', 'Video', 'Edit video', 'video', ['video'], 'Change aspect ratio with AI fill'),
  M('xai/grok-imagine-video-extension', 'Grok Video Extension', 'Video', 'Edit video', 'video', ['video'], 'Extend a clip by 2–10s'),
  M('kwaivgi/kling-o1', 'Kling O1', 'Video', 'Edit video', 'video', ['video'], 'Edit via natural-language commands'),
  M('fictions-ai/autocaption', 'Autocaption', 'Video', 'Edit video', 'video', ['video'], 'Burn in captions'),
  M('lucataco/trim-video', 'Trim Video', 'Video', 'Edit video', 'video', ['video']),
  M('lucataco/video-merge', 'Merge Videos', 'Video', 'Edit video', 'video', ['video']),
  M('lucataco/video-audio-merge', 'Merge Video + Audio', 'Video', 'Edit video', 'video', ['video', 'audio']),

  // — Lipsync and avatars —
  M('sync/lipsync-2-pro', 'Sync Lipsync 2 Pro', 'Video', 'Lipsync & avatars', 'video', ['video', 'audio'], 'Studio grade'),
  M('sync/lipsync-2', 'Sync Lipsync 2', 'Video', 'Lipsync & avatars', 'video', ['video', 'audio']),
  M('prunaai/p-video-avatar', 'P-Video Avatar', 'Video', 'Lipsync & avatars', 'video', ['image', 'audio'], 'Fastest avatar model'),
  M('veed/fabric-1.0', 'Veed Fabric 1.0', 'Video', 'Lipsync & avatars', 'video', ['image', 'audio'], 'Image to talking video'),
  M('bytedance/omni-human', 'OmniHuman', 'Video', 'Lipsync & avatars', 'video', ['image', 'audio']),
  M('kwaivgi/kling-lip-sync', 'Kling Lip Sync', 'Video', 'Lipsync & avatars', 'video', ['video', 'audio']),
  M('pixverse/lipsync', 'PixVerse Lipsync', 'Video', 'Lipsync & avatars', 'video', ['video', 'audio']),
  M('heygen/lipsync-precision', 'HeyGen Lipsync Precision', 'Video', 'Lipsync & avatars', 'video', ['video', 'audio']),
  M('heygen/lipsync-speed', 'HeyGen Lipsync Speed', 'Video', 'Lipsync & avatars', 'video', ['video', 'audio']),
  M('wan-video/wan-2.2-s2v', 'Wan 2.2 S2V', 'Video', 'Lipsync & avatars', 'video', ['image', 'audio'], 'Video from audio + reference image'),
  M('bytedance/latentsync', 'LatentSync', 'Video', 'Lipsync & avatars', 'video', ['video', 'audio']),

  // — Upscale and enhance —
  M('lucataco/real-esrgan-video', 'Real-ESRGAN Video', 'Video', 'Upscale & enhance', 'video', ['video']),
  M('arielreplicate/robust_video_matting', 'Robust Video Matting', 'Video', 'Upscale & enhance', 'video', ['video'], 'Extract the foreground'),
  M('pollinations/real-basicvsr-video-superresolution', 'RealBasicVSR', 'Video', 'Upscale & enhance', 'video', ['video']),

  // ══════════════════════════ AUDIO ══════════════════════════
  // — Text to speech —
  M('elevenlabs/v3', 'ElevenLabs v3', 'Audio', 'Text to speech', 'audio', undefined, 'Audio tags, 70+ languages'),
  M('elevenlabs/v2-multilingual', 'ElevenLabs v2 Multilingual', 'Audio', 'Text to speech', 'audio', undefined, '29 languages'),
  M('elevenlabs/turbo-v2.5', 'ElevenLabs Turbo v2.5', 'Audio', 'Text to speech', 'audio'),
  M('google/gemini-3.1-flash-tts', 'Gemini 3.1 Flash TTS', 'Audio', 'Text to speech', 'audio', undefined, '30 voices, 70+ languages'),
  M('minimax/speech-2.8-hd', 'MiniMax Speech 2.8 HD', 'Audio', 'Text to speech', 'audio', undefined, 'Studio grade, voice cloning'),
  M('minimax/speech-2.8-turbo', 'MiniMax Speech 2.8 Turbo', 'Audio', 'Text to speech', 'audio'),
  M('inworld/realtime-tts-2', 'Inworld Realtime TTS 2', 'Audio', 'Text to speech', 'audio', undefined, 'Natural-language steering'),
  M('inworld/realtime-tts-1.5-max', 'Inworld TTS 1.5 Max', 'Audio', 'Text to speech', 'audio'),
  M('qwen/qwen3-tts', 'Qwen3 TTS', 'Audio', 'Text to speech', 'audio'),
  M('resemble-ai/chatterbox', 'Chatterbox', 'Audio', 'Text to speech', 'audio', ['audio'], 'Voice cloning with emotion control'),
  M('resemble-ai/chatterbox-multilingual', 'Chatterbox Multilingual', 'Audio', 'Text to speech', 'audio', ['audio']),
  M('minimax/voice-cloning', 'MiniMax Voice Cloning', 'Audio', 'Text to speech', 'audio', ['audio']),
  M('jaaari/kokoro-82m', 'Kokoro 82M', 'Audio', 'Text to speech', 'audio', undefined, 'Small and fast, open weights'),
  M('suno-ai/bark', 'Bark', 'Audio', 'Text to speech', 'audio'),

  // — Music —
  M('minimax/music-2.5', 'MiniMax Music 2.5', 'Audio', 'Music', 'audio', undefined, 'Full songs with vocals'),
  M('minimax/music-1.5', 'MiniMax Music 1.5', 'Audio', 'Music', 'audio', undefined, 'Up to 4 minutes'),
  M('elevenlabs/music', 'ElevenLabs Music', 'Audio', 'Music', 'audio', undefined, 'Studio-grade, up to 5 minutes'),
  M('google/lyria-2', 'Lyria 2', 'Audio', 'Music', 'audio', undefined, '48kHz stereo'),
  M('stability-ai/stable-audio-2.5', 'Stable Audio 2.5', 'Audio', 'Music', 'audio', ['audio'], 'Instrumentals and sound effects'),
  M('lucataco/ace-step', 'ACE-Step', 'Audio', 'Music', 'audio', undefined, 'Full songs in ~20s'),
  M('meta/musicgen', 'MusicGen', 'Audio', 'Music', 'audio', ['audio'], 'Melody conditioning'),
  M('riffusion/riffusion', 'Riffusion', 'Audio', 'Music', 'audio'),

  // — Sound effects —
  M('zsxkib/mmaudio', 'MMAudio', 'Audio', 'Sound effects', 'audio', ['video'], 'Contextual audio for a video'),
  M('thinksound/thinksound', 'ThinkSound', 'Audio', 'Sound effects', 'audio', ['video'], 'Synchronized audio generation'),
  M('lucataco/extract-audio', 'Extract Audio', 'Audio', 'Sound effects', 'audio', ['video'], 'Pull the audio track out of a video'),

  // — Speech to text —
  M('openai/whisper', 'Whisper', 'Audio', 'Speech to text', 'text', ['audio'], 'Transcription'),
  M('victor-upmeet/whisperx', 'WhisperX', 'Audio', 'Speech to text', 'text', ['audio'], 'Word-level timestamps'),
  M('vaibhavs10/incredibly-fast-whisper', 'Incredibly Fast Whisper', 'Audio', 'Speech to text', 'text', ['audio']),

  // ══════════════════════════ 3D ══════════════════════════
  M('tencent/hunyuan-3d-3.1', 'Hunyuan 3D 3.1', '3D', 'Generate from image', 'model3d', ['image'], 'Texture fidelity and geometry'),
  M('prunaai/hunyuan3d-2', 'Hunyuan3D 2 (fast)', '3D', 'Generate from image', 'model3d', ['image'], 'Octree resolution controls'),
  M('tencent/hunyuan3d-2mv', 'Hunyuan3D 2 Multi-View', '3D', 'Generate from image', 'model3d', ['image'], 'Front/back/left/right inputs'),
  M('fishwowater/trellis2', 'TRELLIS.2', '3D', 'Generate from image', 'model3d', ['image']),
  M('firtoz/trellis', 'TRELLIS', '3D', 'Generate from image', 'model3d', ['image']),
  M('hyper3d/rodin', 'Rodin Gen-2', '3D', 'Generate from image', 'model3d', ['image'], 'Complex models from images'),
  M('adirik/wonder3d', 'Wonder3D', '3D', 'Generate from image', 'model3d', ['image'], 'Single image to 3D'),
  M('jd7h/zero123plusplus', 'Zero123++', '3D', 'Generate from image', 'model3d', ['image'], 'Multi-angle from one reference'),
  M('adirik/mvdream', 'MVDream', '3D', 'Generate from text', 'model3d'),
  M('cjwbw/shap-e', 'Shap-E', '3D', 'Generate from text', 'model3d'),
  M('adirik/texture', 'Texture', '3D', 'Textures', 'image', ['image'], 'Procedural textures from language'),
  M('adirik/text2tex', 'Text2Tex', '3D', 'Textures', 'image', ['image'], 'Texture a 3D asset from text'),

  // ══════════════════════════ UTILITY ══════════════════════════
  // — Caption and describe —
  M('google/gemini-3-flash', 'Gemini 3 Flash', 'Utility', 'Caption & describe', 'text', ['image', 'video']),
  M('openai/gpt-5.4', 'GPT-5.4', 'Utility', 'Caption & describe', 'text', ['image']),
  M('anthropic/claude-4.5-sonnet', 'Claude 4.5 Sonnet', 'Utility', 'Caption & describe', 'text', ['image']),
  M('lucataco/moondream2', 'Moondream 2', 'Utility', 'Caption & describe', 'text', ['image'], 'Small and fast'),
  M('salesforce/blip', 'BLIP', 'Utility', 'Caption & describe', 'text', ['image']),
  M('pharmapsychotic/clip-interrogator', 'CLIP Interrogator', 'Utility', 'Caption & describe', 'text', ['image'], 'Image to prompt'),

  // — Detect and segment —
  M('meta/sam-2-video', 'SAM 2 (video)', 'Utility', 'Detect & segment', 'video', ['video'], 'Segment anything'),

  // — Media utilities —
  M('lucataco/frame-extractor', 'Frame Extractor', 'Utility', 'Media utilities', 'image', ['video'], 'Grab a still from a video'),
  M('lucataco/vid2webp', 'Video to WebP', 'Utility', 'Media utilities', 'image', ['video'], 'Looping WebP'),
  M('lucataco/split-screen-video', 'Split Screen Video', 'Utility', 'Media utilities', 'video', ['video']),
]

/**
 * Replicate publishes no pricing through its API, and model pages render the
 * figure client-side, so there is nothing to fetch or scrape. These are the
 * rates listed on replicate.com/pricing; everything else shows no label rather
 * than a guess. Add a slug here to surface its price on the node and in the menu.
 */
const PRICES: Record<string, string> = {
  'black-forest-labs/flux-schnell': '$0.003 / image',
  'black-forest-labs/flux-dev': '$0.025 / image',
  'black-forest-labs/flux-1.1-pro': '$0.04 / image',
  'ideogram-ai/ideogram-v3-turbo': '$0.03 / image',
  'ideogram-ai/ideogram-v3-quality': '$0.09 / image',
  'recraft-ai/recraft-v3': '$0.04 / image',
}

export function priceFor(id: string): string | undefined {
  return PRICES[id]
}

export function modelUrl(id: string) {
  return `https://replicate.com/${id}`
}

export const CATEGORIES: Category[] = ['Image', 'Video', 'Audio', '3D', 'Utility']

export function getModel(id: string) {
  return MODELS.find((m) => m.id === id)
}

export function groupsFor(category: Category) {
  return [...new Set(MODELS.filter((m) => m.category === category).map((m) => m.group))]
}

export function modelsIn(category: Category, group: string) {
  return MODELS.filter((m) => m.category === category && m.group === group)
}

export function searchModels(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return MODELS.filter((m) =>
    `${m.name} ${m.id} ${m.group} ${m.category} ${m.note ?? ''}`.toLowerCase().includes(q),
  ).slice(0, 60)
}
