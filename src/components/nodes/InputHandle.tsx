import { Handle, Position } from '@xyflow/react'

/**
 * A target handle anchored to the input it feeds rather than to the middle of the
 * node, so every dot on a node's left edge means one specific thing — prompt,
 * image, last frame. Render it inside a `relative` wrapper around the field; the
 * offsets put it on the node's left border, level with the field's label row.
 */
export function InputHandle({ id, title }: { id: string; title?: string }) {
  return (
    <Handle
      type="target"
      position={Position.Left}
      id={id}
      title={title}
      style={{ left: -19, top: 8 }}
    />
  )
}
