export function HomePage({
  onOpenImageGenerator,
  onOpenContentGenerator,
}: {
  onOpenImageGenerator: () => void;
  onOpenContentGenerator: () => void;
}) {
  return (
    <main className="home-page">
      <div className="home-orb home-orb-purple" />
      <div className="home-orb home-orb-pink" />
      <div className="home-orb home-orb-cyan" />

      <header className="home-header">
        <button
          type="button"
          className="home-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="home-brand-mark">✦</span>
          <span className="home-brand-text">
            <strong>Creative AI</strong>
            <small>Studio</small>
          </span>
        </button>

        <div className="home-ai-badge">
          <span className="home-status-dot" />
          AI CREATIVE WORKSPACE
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-eyebrow">
            <span>✦</span>
            CREATE • DESIGN • GENERATE
          </div>

          <h1>
            Bring your ideas
            <span> to life with AI.</span>
          </h1>

          <p>
            A single creative workspace for generating powerful visuals and
            engaging content. Choose a workspace and start creating.
          </p>

          <div className="home-steps">
            <div className="home-step">
              <strong>01</strong>
              <span>Choose</span>
            </div>
            <div className="home-step-line" />
            <div className="home-step">
              <strong>02</strong>
              <span>Create</span>
            </div>
            <div className="home-step-line" />
            <div className="home-step">
              <strong>03</strong>
              <span>Refine</span>
            </div>
          </div>
        </div>

        <div className="home-visual" aria-hidden="true">
          <div className="home-ring home-ring-large" />
          <div className="home-ring home-ring-small" />
          <div className="home-visual-core">
            <span className="home-visual-spark">✦</span>
            <strong>AI</strong>
            <small>CREATE</small>
          </div>
          <span className="home-float home-float-one">✦</span>
          <span className="home-float home-float-two">◆</span>
          <span className="home-float home-float-three">●</span>
          <span className="home-float home-float-four">✧</span>
        </div>
      </section>

      <section className="home-workspaces">
        <div className="home-section-heading">
          <div>
            <span>YOUR WORKSPACES</span>
            <h2>What do you want to create?</h2>
          </div>
          <p>Pick a creative tool and turn your idea into something impressive.</p>
        </div>

        <div className="home-workspace-grid">
          <button
            type="button"
            className="home-workspace-card home-image-card"
            onClick={onOpenImageGenerator}
          >
            <div className="home-card-glow" />

            <div className="home-card-top">
              <span className="home-card-icon home-image-icon">
                <span className="home-image-frame">
                  <span className="home-image-sun" />
                  <span className="home-image-mountain" />
                </span>
              </span>
              <span className="home-card-arrow">↗</span>
            </div>

            <div className="home-card-body">
              <span className="home-card-kicker">VISUAL CREATION</span>
              <h3>Image Generator</h3>
              <p>
                Create images from references, templates and prompts using
                your selected AI services.
              </p>
            </div>

            <div className="home-card-tags">
              <span>References</span>
              <span>Templates</span>
              <span>AI Images</span>
            </div>
          </button>

          <button
            type="button"
            className="home-workspace-card home-content-card"
            onClick={onOpenContentGenerator}
          >
            <div className="home-card-glow" />

            <div className="home-card-top">
              <span className="home-card-icon home-content-icon">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span className="home-card-arrow">↗</span>
            </div>

            <div className="home-card-body">
              <span className="home-card-kicker">CONTENT CREATION</span>
              <h3>Content Generator</h3>
              <p>
                Create structured and engaging content for training, marketing,
                presentations, documentation and more.
              </p>
            </div>

            <div className="home-card-tags">
              <span>Ideas</span>
              <span>Writing</span>
              <span>Content</span>
            </div>
          </button>
        </div>
      </section>

      <section className="home-bottom-banner">
        <span>✦</span>
        <div>
          <strong>One workspace. Endless possibilities.</strong>
          <small>Choose a tool above and start creating.</small>
        </div>
      </section>

      <footer className="home-footer">
        <span>Creative AI Studio</span>
        <span>AI-powered creation workspace</span>
      </footer>
    </main>
  );
}

export function ContentGeneratorHome() {
  return (
    <main className="content-generator-placeholder">
      <div className="content-generator-placeholder-card">
        <div className="content-generator-placeholder-icon">✦</div>
        <span>CONTENT GENERATOR</span>
        <h1>Content creation workspace</h1>
        <p>
          This is the dedicated Content Generator area. You can launch it
          independently from the Image Generator.
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          ← Back to Home
        </button>
      </div>
    </main>
  );
}

