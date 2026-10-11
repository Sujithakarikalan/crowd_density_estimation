const APPLICATIONS = [
  'Public event monitoring',
  'Stadium monitoring',
  'Transportation hubs',
  'Crowd management',
  'Emergency response support',
  'Smart-city monitoring',
]

export default function About() {
  return (
    <div className="page">
      <section className="hero compact">
        <div>
          <div className="eyebrow">FINAL-YEAR DEEP LEARNING PROJECT</div>
          <h1>Deep Learning-Based Crowd Density Estimation for Public Safety Applications</h1>
          <p>
            An end-to-end system that connects a React dashboard to a FastAPI service running a
            trained CSRNet model for density estimation and decision support.
          </p>
        </div>
      </section>

      <section className="card prose-card">
        <h2>Problem Statement</h2>
        <p>
          Dense public spaces are difficult to monitor with manual observation alone. Counting
          people by hand is slow, inconsistent, and impractical in congested scenes where
          occlusion is severe. Automated density estimation can give operators a faster picture
          of how crowded a scene is so they can prioritize attention.
        </p>
      </section>

      <section className="card prose-card">
        <h2>Objective</h2>
        <p>
          Build a working web application that accepts a crowd image, runs the project&apos;s trained
          CSRNet checkpoint, and returns crowd count, a density heatmap, an overlay, and a
          project-defined public-safety classification. The system is intended as an AI-based
          decision-support tool for monitoring — not as an autonomous control system.
        </p>
      </section>

      <section className="card prose-card">
        <h2>Methodology</h2>
        <p>
          CSRNet was trained on ShanghaiTech Part A (300 training images, 182 test images) for 20
          epochs. At inference time the backend preprocesses an uploaded RGB image, normalizes it
          with ImageNet statistics, and produces a density map. Crowd count is the integral of
          that map. Visualization resizes the density map to the original image size and applies
          a jet colormap. Safety labels use project-defined count thresholds.
        </p>
      </section>

      <section className="card prose-card">
        <h2>Technology Stack</h2>
        <ul>
          <li>Deep learning: PyTorch CSRNet with VGG-16 frontend and dilated backend</li>
          <li>Backend API: FastAPI, Uvicorn, Pillow, OpenCV, NumPy</li>
          <li>Frontend: React, Vite, Axios</li>
          <li>Computer vision outputs: density heatmap and image overlay</li>
        </ul>
      </section>

      <section className="card prose-card">
        <h2>Applications</h2>
        <div className="chip-row">
          {APPLICATIONS.map((item) => (
            <span key={item} className="chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="card prose-card">
        <h2>Limitations</h2>
        <p>
          Accuracy depends on how similar the uploaded scene is to ShanghaiTech Part A. Unusual
          camera angles, night scenes, extreme weather, or very different crowd appearances can
          increase error. Count estimates are approximate (MAE 84.087 on the test split). Safety
          labels are application thresholds, not certified occupancy limits. GPU availability
          affects speed but not the model definition.
        </p>
      </section>

      <section className="card prose-card">
        <h2>Future Scope</h2>
        <p>
          Future work can include video streams, multi-camera fusion, domain adaptation to local
          venues, calibrated camera geometry for people per square metre, and operator-in-the-loop
          review tools. Live deployment would also need privacy, audit, and incident-response
          processes beyond this academic system.
        </p>
      </section>

      <section className="card disclaimer">
        This system is an AI-based decision-support tool and does not replace trained security or
        emergency personnel.
      </section>
    </div>
  )
}
