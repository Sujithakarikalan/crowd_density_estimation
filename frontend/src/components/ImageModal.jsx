import { X } from 'lucide-react'

export default function ImageModal({ title, src, onClose }) {
  if (!src) return null
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <img src={src} alt={title} />
      </div>
    </div>
  )
}
