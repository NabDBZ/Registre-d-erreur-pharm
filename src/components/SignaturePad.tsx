import { useRef, useState } from 'react'
import { Eraser, Check } from 'lucide-react'
import { Modal, Button } from './ui'

/** Canvas-based electronic signature capture — a drawn signature, timestamped by the caller on confirm. */
export default function SignaturePad({
  open,
  onClose,
  onConfirm,
  nomSignataire
}: {
  open: boolean
  onClose: () => void
  onConfirm: (dataUrl: string) => void
  nomSignataire: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={`Signature électronique — ${nomSignataire}`}>
      {open && <PadBody onClose={onClose} onConfirm={onConfirm} nomSignataire={nomSignataire} />}
    </Modal>
  )
}

function PadBody({ onClose, onConfirm, nomSignataire }: { onClose: () => void; onConfirm: (dataUrl: string) => void; nomSignataire: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasStroke = useRef(false)
  const [empty, setEmpty] = useState(true)

  function ctx() {
    return canvasRef.current?.getContext('2d') ?? null
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    drawing.current = true
    const c = ctx()
    if (!c) return
    const { x, y } = pointerPos(e)
    c.beginPath()
    c.moveTo(x, y)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const c = ctx()
    if (!c) return
    const { x, y } = pointerPos(e)
    c.lineTo(x, y)
    c.strokeStyle = '#14201c'
    c.lineWidth = 2.2
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.stroke()
    hasStroke.current = true
    setEmpty(false)
  }

  function end() {
    drawing.current = false
  }

  function clear() {
    const canvas = canvasRef.current
    const c = ctx()
    if (!canvas || !c) return
    c.clearRect(0, 0, canvas.width, canvas.height)
    hasStroke.current = false
    setEmpty(true)
  }

  function confirmer() {
    const canvas = canvasRef.current
    if (!canvas || !hasStroke.current) return
    onConfirm(canvas.toDataURL('image/png'))
  }

  return (
    <div>
      <p className="text-[13px] text-graphite mb-1">
        <strong className="text-ink">{nomSignataire}</strong> confirme, par cette signature, avoir pris connaissance de ce signalement.
      </p>
      <p className="text-[12px] text-steel mb-4">Signez avec la souris, le doigt ou un stylet dans le cadre ci-dessous.</p>
      <div className="border-2 border-fog rounded-md bg-white overflow-hidden" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={440}
          height={180}
          className="w-full block cursor-crosshair"
          style={{ height: 180 }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <button type="button" onClick={clear} className="flex items-center gap-1.5 text-[12px] text-steel hover:text-hazard-h">
          <Eraser size={13} /> Effacer
        </button>
        <span className="text-[11px] text-silver">Sera horodaté automatiquement</span>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button type="button" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="button" onClick={confirmer} disabled={empty}>
          <Check size={15} /> Confirmer la signature
        </Button>
      </div>
    </div>
  )
}
