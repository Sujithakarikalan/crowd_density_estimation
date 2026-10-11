import { useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock3,
  Cpu,
  Image as ImageIcon,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import ImageModal from '../components/ImageModal'
import { mediaUrl, predictCrowd } from '../services/api'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']

function levelClass(level) {
  return (level || '').toLowerCase()
}

export default function Dashboard({ online }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)

  const onFile = (next) => {
    if (!next) return
    const typeOk = ACCEPT.includes(next.type) || /\.(jpe?g|png|webp)$/i.test(next.name)
    if (!typeOk) {
      setError('Unable to analyze this image. Please upload a valid JPG, PNG, or WEBP image.')
      return
    }
    if (next.size > 12 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 12 MB.')
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    setPreview(URL.createObjectURL(next))
    setResult(null)
    setError('')
  }

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const analyze = async () => {
    if (!file || loading) return
    setLoading(true)
    setError('')
    try {
      const data = await predictCrowd(file)
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err.message || 'Unable to analyze this image. Please upload a valid JPG, PNG, or WEBP image.')
    } finally {
      setLoading(false)
    }
  }

  const riskLabel = useMemo(() => {
    if (!result) return ''
    return result.risk_display || result.risk_status
  }, [result])

  return (
    <div className="page">
      <section className="hero">
        <div>
          <div className="eyebrow">PUBLIC SAFETY • CSRNET</div>
          <h1>
            AI-Powered Crowd
            <br />
            <em>Density Monitoring</em>
          </h1>
          <p>Deep learning based crowd estimation for public safety applications</p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>CSRNet</strong>
            <span>Model</span>
          </div>
          <div>
            <strong>0.9275</strong>
            <span>Correlation</span>
          </div>
          <div>
            <strong>20</strong>
            <span>Epochs</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="banner error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {!online && !error && (
        <div className="banner warn">
          <AlertTriangle size={18} />
          <span>Backend offline. Start FastAPI on port 8000 to run CSRNet inference.</span>
        </div>
      )}

      <section className="split">
        <article className="card">
          <div className="card-title">
            <span>
              <Upload size={18} /> Upload Crowd Image
            </span>
            <small>JPG • JPEG • PNG • WEBP</small>
          </div>
          <label
            className="dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              onFile(event.dataTransfer.files[0])
            }}
          >
            {preview ? (
              <img src={preview} alt="Selected crowd scene" />
            ) : (
              <div className="drop-empty">
                <div className="upload-icon">
                  <ImageIcon size={28} />
                </div>
                <h3>Drop a crowd image here</h3>
                <p>or browse files from your device</p>
                <span className="ghost-btn">Browse Files</span>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              hidden
              onChange={(event) => onFile(event.target.files[0])}
            />
          </label>
          <div className="actions">
            <button className="primary" disabled={!file || loading} onClick={analyze}>
              {loading ? (
                <>
                  <span className="spinner" /> Analyzing Crowd
                </>
              ) : (
                <>
                  Analyze Crowd <Activity size={18} />
                </>
              )}
            </button>
            {file && (
              <button className="ghost" disabled={loading} onClick={removeFile}>
                Remove
              </button>
            )}
          </div>
        </article>

        <article className="card results">
          <div className="card-title">
            <span>
              <Activity size={18} /> Analysis Results
            </span>
            {result && <span className="live">LIVE</span>}
          </div>

          {loading && (
            <div className="empty">
              <span className="big-spinner" />
              <h3>Analyzing crowd density...</h3>
              <p>Running CSRNet inference...</p>
            </div>
          )}

          {!loading && !result && (
            <div className="empty">
              <Cpu size={42} />
              <h3>Upload an image to begin analysis</h3>
              <p>Crowd count, safety level, density heatmap and overlay will appear here after inference.</p>
            </div>
          )}

          {!loading && result && (
            <>
              <div className="count-block">
                <span>Estimated Crowd</span>
                <strong>{Number(result.crowd_count_rounded).toLocaleString()}</strong>
                <small>
                  people <b>({Number(result.crowd_count).toFixed(2)})</b>
                </small>
              </div>
              <div className={`safety-card ${levelClass(result.safety_level)}`}>
                <div>
                  <span>Density Level</span>
                  <strong>{result.safety_level}</strong>
                </div>
                <p className="risk-line">{riskLabel}</p>
                <p className="action-line">{result.recommended_action}</p>
              </div>
              <div className="metric-grid">
                <Metric icon={<ShieldCheck size={16} />} label="Risk Status" value={result.risk_status} />
                <Metric icon={<Clock3 size={16} />} label="Processing Time" value={`${result.processing_time}s`} />
                <Metric icon={<Cpu size={16} />} label="AI Device" value={String(result.device).toUpperCase()} />
                <Metric icon={<Activity size={16} />} label="Model" value={result.model || 'CSRNet'} />
              </div>
            </>
          )}
        </article>
      </section>

      {result && (
        <section className="card visuals">
          <div className="card-title">
            <span>
              <ImageIcon size={18} /> Density Visualization
            </span>
            <small>CLICK TO ENLARGE</small>
          </div>
          <div className="visual-grid">
            <Viz title="Original Image" src={mediaUrl(result.original_image_url)} onOpen={setModal} />
            <Viz title="Predicted Density Map" src={mediaUrl(result.density_map_url)} onOpen={setModal} />
            <Viz title="Heatmap Overlay" src={mediaUrl(result.overlay_url)} onOpen={setModal} />
          </div>
        </section>
      )}

      <ImageModal title={modal?.title} src={modal?.src} onClose={() => setModal(null)} />
    </div>
  )
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      {icon}
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
    </div>
  )
}

function Viz({ title, src, onOpen }) {
  return (
    <button type="button" className="viz" onClick={() => onOpen({ title, src })}>
      <div>
        <b>{title}</b>
        <span>View</span>
      </div>
      <img src={src} alt={title} />
    </button>
  )
}
