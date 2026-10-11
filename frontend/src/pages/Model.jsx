import { Cpu, Layers, Sigma } from 'lucide-react'

const METRICS = [
  ['Model', 'CSRNet'],
  ['Dataset', 'ShanghaiTech Part A'],
  ['Training Images', '300'],
  ['Test Images', '182'],
  ['Epochs', '20'],
  ['MAE', '84.087'],
  ['RMSE', '132.586'],
  ['MAPE', '20.86%'],
  ['Correlation', '0.9275'],
]

export default function Model() {
  return (
    <div className="page">
      <section className="hero compact">
        <div>
          <div className="eyebrow">TRAINED CHECKPOINT</div>
          <h1>
            Model <em>Information</em>
          </h1>
          <p>
            CrowdSafe AI infers crowd density with the project&apos;s trained CSRNet checkpoint
            <code> best_csrnet_improved.pth</code>. These metrics are the actual evaluation results
            recorded for this model — they are not placeholders.
          </p>
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <span>
            <Sigma size={18} /> Evaluation Results
          </span>
          <small>SHANGHAITECH PART A</small>
        </div>
        <div className="info-grid">
          {METRICS.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="two-col">
        <article className="card">
          <div className="card-title">
            <span>
              <Layers size={18} /> CSRNet Architecture
            </span>
          </div>
          <p className="prose">
            CSRNet (Congested Scene Recognition Network) estimates a density map rather than
            detecting each person. A VGG-16 frontend extracts multi-scale appearance features.
            A dilated-convolution backend expands the receptive field without further downsampling,
            so spatial layout is preserved. A 1×1 convolution produces a single-channel density map.
            Crowd count is the sum of that map.
          </p>
          <ul className="arch-list">
            <li>Frontend: VGG-16 convolutional layers (first 10 conv blocks)</li>
            <li>Backend: six dilated 3×3 convolutions (dilation = 2)</li>
            <li>Output: Conv2d(64 → 1, kernel 1×1)</li>
            <li>Normalization: ImageNet mean / std</li>
          </ul>
        </article>
        <article className="card">
          <div className="card-title">
            <span>
              <Cpu size={18} /> Inference Pipeline
            </span>
          </div>
          <ol className="steps">
            <li>Upload is validated as JPG, JPEG, PNG, or WEBP.</li>
            <li>The image is converted to RGB and resized with aspect ratio preserved.</li>
            <li>Pixels are normalized and sent through CSRNet on CUDA when available, otherwise CPU.</li>
            <li>The predicted density map is summed to obtain crowd count.</li>
            <li>Heatmap and overlay images are generated from the same density map.</li>
            <li>Project-defined thresholds assign a safety level for decision support.</li>
          </ol>
          <p className="note">
            Safety thresholds (LOW 0–24, MODERATE 25–74, HIGH 75–149, CRITICAL 150+) are
            project-defined application levels. They are not official universal public-safety standards.
          </p>
        </article>
      </section>
    </div>
  )
}
