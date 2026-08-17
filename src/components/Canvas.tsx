import {
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiKeyDialog } from './ApiKeyDialog'
import { ApiKeyGate } from './ApiKeyGate'
import { BottomToolbar, type Tool } from './BottomToolbar'
import { CanvasMenu, type MenuTarget } from './CanvasMenu'
import { EmptyState } from './EmptyState'
import { ImportDialog } from './ImportDialog'
import { LeftRail } from './LeftRail'
import { Lightbox } from './Lightbox'
import { SidePanel, type PanelTab } from './SidePanel'
import { EffectNode } from './nodes/EffectNode'
import { GenNode } from './nodes/GenNode'
import { ImageNode } from './nodes/ImageNode'
import { PromptNode } from './nodes/PromptNode'
import { useStore } from '@/store'

const nodeTypes: NodeTypes = {
  prompt: PromptNode,
  image: ImageNode,
  gen: GenNode,
  effect: EffectNode,
}

function Flow() {
  const wrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [tool, setTool] = useState<Tool>('select')
  const [menu, setMenu] = useState<MenuTarget | null>(null)
  const [keyOpen, setKeyOpen] = useState(false)
  const [panel, setPanel] = useState<PanelTab | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [dropping, setDropping] = useState(false)

  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const onNodesChange = useStore((s) => s.onNodesChange)
  const onEdgesChange = useStore((s) => s.onEdgesChange)
  const onConnect = useStore((s) => s.onConnect)
  const addPromptNode = useStore((s) => s.addPromptNode)
  const addImageNode = useStore((s) => s.addImageNode)
  const addModelNode = useStore((s) => s.addModelNode)
  const addEffectNode = useStore((s) => s.addEffectNode)
  const applyTemplate = useStore((s) => s.applyTemplate)
  const ready = useStore((s) => s.ready)
  const resolvedTheme = useStore((s) => s.resolvedTheme)

  // Load the last opened project (or start a fresh one) on first paint.
  useEffect(() => {
    useStore.getState().init()
  }, [])

  const openMenuAt = useCallback(
    (screenX: number, screenY: number) => {
      const flow = screenToFlowPosition({ x: screenX, y: screenY })
      setMenu({ screenX, screenY, flowX: flow.x, flowY: flow.y })
    },
    [screenToFlowPosition],
  )

  const openMenuAtCenter = useCallback(
    () => openMenuAt(window.innerWidth / 2 - 300, window.innerHeight / 2 - 200),
    [openMenuAt],
  )

  /** Turns dropped or pasted files into image nodes, laid out left to right. */
  const addImageFiles = useCallback(
    async (files: File[], screen: { x: number; y: number }) => {
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (!images.length) return
      const at = screenToFlowPosition(screen)
      for (const [i, file] of images.entries()) {
        await addImageNode({ x: at.x + i * 300, y: at.y }, file)
      }
    },
    [addImageNode, screenToFlowPosition],
  )

  // Pasting an image anywhere on the canvas drops it in as a source node.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (!files.some((f) => f.type.startsWith('image/'))) return
      event.preventDefault()
      addImageFiles(files, { x: window.innerWidth / 2, y: window.innerHeight / 2 })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addImageFiles])

  return (
    <div
      ref={wrapper}
      className="h-full w-full"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setDropping(true)
      }}
      onDragLeave={(event) => {
        // Only reset when the pointer actually leaves the canvas, not a child.
        if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) {
          setDropping(false)
        }
      }}
      onDrop={(event) => {
        const files = Array.from(event.dataTransfer.files ?? [])
        if (!files.length) return
        event.preventDefault()
        setDropping(false)
        addImageFiles(files, { x: event.clientX, y: event.clientY })
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={(event) => {
          event.preventDefault()
          const e = event as React.MouseEvent
          openMenuAt(e.clientX, e.clientY)
        }}
        onPaneClick={() => setMenu(null)}
        // Dragging the canvas with any mouse button pans it; hold Shift to
        // rubber-band select instead.
        panOnDrag={[0, 1, 2]}
        selectionOnDrag={false}
        selectionKeyCode="Shift"
        // The hand tool locks nodes in place so panning can't nudge them.
        nodesDraggable={tool === 'select'}
        // Two-finger trackpad movement pans in any direction; pinch zooms.
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
      >
        {/*
          Faint enough to read as texture, strong enough to give the pan a sense
          of motion. React Flow writes this into an SVG fill, so it takes a value
          rather than a var.
        */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.4}
          color={resolvedTheme === 'light' ? '#cfcfd6' : '#33333a'}
        />
      </ReactFlow>

      <LeftRail
        panel={panel}
        onTogglePanel={(tab) => setPanel((current) => (current === tab ? null : tab))}
        onOpenImport={() => setImportOpen(true)}
        onOpenKey={() => setKeyOpen(true)}
      />
      <SidePanel tab={panel} onTabChange={setPanel} onClose={() => setPanel(null)} />
      <BottomToolbar tool={tool} onToolChange={setTool} onAdd={openMenuAtCenter} />

      {ready && nodes.length === 0 && (
        <EmptyState
          onPick={(templateId) => {
            // Templates run left to right, so anchor them left of centre.
            const at = screenToFlowPosition({
              x: window.innerWidth / 2 - 420,
              y: window.innerHeight / 2 - 180,
            })
            applyTemplate(templateId, at)
          }}
        />
      )}

      {menu && (
        <CanvasMenu
          target={menu}
          onClose={() => setMenu(null)}
          onPick={(choice, at) => {
            if (choice.kind === 'prompt') addPromptNode(at)
            else if (choice.kind === 'image') addImageNode(at)
            else if (choice.kind === 'effect') addEffectNode(choice.effectId, at)
            else addModelNode(choice.modelId, at)
          }}
        />
      )}

      {dropping && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-accent-dim bg-black/40">
          <span className="surface px-3 py-2 text-[13px]">Drop to add an image node</span>
        </div>
      )}

      <Lightbox />

      <ApiKeyGate onOpenKey={() => setKeyOpen(true)} />
      <ApiKeyDialog open={keyOpen} onOpenChange={setKeyOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  )
}
