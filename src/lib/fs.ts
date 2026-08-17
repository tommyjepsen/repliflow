/**
 * Writes generated files into a `repliflow/` subfolder the user nominates once.
 *
 * A plain `<a download>` cannot target a subfolder — browsers strip path
 * separators from the filename — so a real folder needs the File System Access
 * API. That is Chromium-only, hence the fallback to an ordinary download.
 */

import { idbGet, idbPut } from './db'

const HANDLE_KEY = 'downloadFolder'
const SUBFOLDER = 'repliflow'

type PermissionCapableHandle = FileSystemDirectoryHandle & {
  queryPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}

export function folderPickerSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** Root folder the user chose; files go into its `repliflow/` subfolder. */
async function loadHandle() {
  return (await idbGet<PermissionCapableHandle>('projects', HANDLE_KEY)) ?? null
}

async function hasPermission(handle: PermissionCapableHandle, request: boolean) {
  const options = { mode: 'readwrite' } as const
  const state = (await handle.queryPermission?.(options)) ?? 'granted'
  if (state === 'granted') return true
  if (!request) return false
  return (await handle.requestPermission?.(options)) === 'granted'
}

/** Prompts for a folder. Must be called from a user gesture. */
export async function chooseDownloadFolder() {
  const picker = (
    window as unknown as {
      showDirectoryPicker: (o?: { mode?: string; startIn?: string }) => Promise<FileSystemDirectoryHandle>
    }
  ).showDirectoryPicker

  const handle = (await picker({ mode: 'readwrite', startIn: 'downloads' })) as PermissionCapableHandle
  // Handles are structured-cloneable, so IndexedDB can persist them across sessions.
  await idbPut('projects', handle, HANDLE_KEY)
  return handle.name
}

export async function forgetDownloadFolder() {
  await idbPut('projects', null, HANDLE_KEY)
}

export type FolderStatus =
  | { state: 'unsupported' }
  | { state: 'none' }
  | { state: 'ready'; name: string }
  | { state: 'needs-permission'; name: string }

export async function getFolderStatus(): Promise<FolderStatus> {
  if (!folderPickerSupported()) return { state: 'unsupported' }
  const handle = await loadHandle()
  if (!handle) return { state: 'none' }
  const granted = await hasPermission(handle, false)
  return granted ? { state: 'ready', name: handle.name } : { state: 'needs-permission', name: handle.name }
}

/** Re-grants access to a previously chosen folder. Needs a user gesture. */
export async function reconnectDownloadFolder() {
  const handle = await loadHandle()
  if (!handle) return false
  return hasPermission(handle, true)
}

/**
 * Writes a blob into `<chosen folder>/repliflow/`. Returns false when no
 * folder is configured or usable, so the caller can fall back.
 */
export async function writeToFolder(blob: Blob, filename: string) {
  if (!folderPickerSupported()) return false

  const root = await loadHandle()
  if (!root || !(await hasPermission(root, false))) return false

  try {
    const folder = await root.getDirectoryHandle(SUBFOLDER, { create: true })
    const file = await folder.getFileHandle(filename, { create: true })
    const writable = await file.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch {
    return false
  }
}
