import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const ShieldIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
);

const features = [
  {
    icon: '🔍',
    title: 'AI-Powered Analysis',
    description: 'Advanced AI analyzes your change requests and identifies risks, impacts, and required actions in seconds.',
  },
  {
    icon: '⚠️',
    title: 'Risk Assessment',
    description: 'Instant risk scoring from Low to Critical with detailed breakdowns of potential failure points.',
  },
  {
    icon: '📋',
    title: 'Actionable Recommendations',
    description: 'Get specific mitigation strategies, required checks, and approval considerations tailored to your change.',
  },
  {
    icon: '📜',
    title: 'Persistent History',
    description: 'Every analysis is saved to your account. Review, revisit, and learn from past change decisions.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    description: 'Your analyses are private. Each user account has completely isolated data with JWT authentication.',
  },
  {
    icon: '⚡',
    title: 'Instant Results',
    description: 'Get comprehensive change analysis in under 5 seconds. No lengthy review cycles or manual effort.',
  },
];

const steps = [
  { step: '01', title: 'Describe Your Change', desc: 'Enter a plain-language description of your change request, deployment, or configuration update.' },
  { step: '02', title: 'AI Analysis', desc: 'ChangeGuard AI processes your request using advanced language models trained on IT change management best practices.' },
  { step: '03', title: 'Review Results', desc: 'Get a structured report with risk level, impact areas, recommendations, and a rollback plan.' },
  { step: '04', title: 'Act with Confidence', desc: 'Follow the AI-generated checklist to execute your change safely, with all risks mitigated.' },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <ShieldIcon />
            <span>ChangeGuard <span className="brand-ai">AI</span></span>
          </div>
          <div className="landing-nav-links">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary">Login</Link>
                <Link to="/register" className="btn btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">🛡️ AI-Powered Change Management</div>
        <h1 className="hero-title">
          Deploy Changes<br />
          <span className="hero-gradient">Without the Risk</span>
        </h1>
        <p className="hero-subtitle">
          ChangeGuard AI analyzes your change requests, infrastructure updates, and deployments
          to identify risks, recommend mitigations, and guide safer change execution.
        </p>
        <div className="hero-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard →</Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg">Create Free Account →</Link>
              <Link to="/login" className="btn btn-secondary btn-lg">Login</Link>
            </>
          )}
        </div>
        <div className="hero-stats">
          <div className="stat"><span className="stat-value">AI</span><span className="stat-label">Powered Analysis</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-value">5s</span><span className="stat-label">Average Response</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-value">100%</span><span className="stat-label">Private History</span></div>
        </div>
      </section>

      {/* Demo preview */}
      <section className="demo-preview">
        <div className="demo-card">
          <div className="demo-header">
            <div className="demo-dot red" /><div className="demo-dot yellow" /><div className="demo-dot green" />
            <span className="demo-title">ChangeGuard AI Analysis</span>
          </div>
          <div className="demo-body">
            <div className="demo-input-box">
              <div className="demo-label">Change Request</div>
              <div className="demo-text">"Deploy new API version v2.3.1 to production with database schema migration"</div>
            </div>
            <div className="demo-result">
              <div className="demo-result-row">
                <span className="demo-result-key">Risk Level</span>
                <span className="badge badge-high">HIGH</span>
              </div>
              <div className="demo-result-row">
                <span className="demo-result-key">Risk Score</span>
                <span className="demo-result-val">8/10</span>
              </div>
              <div className="demo-result-row">
                <span className="demo-result-key">Downtime</span>
                <span className="demo-result-val">45–60 min</span>
              </div>
              <div className="demo-result-row">
                <span className="demo-result-key">Category</span>
                <span className="demo-result-val">Deployment + Database</span>
              </div>
              <div className="demo-risks">
                <div className="demo-risk-item">⚠ Data loss risk during schema migration</div>
                <div className="demo-risk-item">⚠ API incompatibility with existing clients</div>
                <div className="demo-risk-item">⚠ Extended downtime if rollback required</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="section-header">
          <h2>Everything you need for safe change management</h2>
          <p>ChangeGuard AI brings AI-powered intelligence to every change in your system.</p>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section section-alt">
        <div className="section-header">
          <h2>How ChangeGuard AI Works</h2>
          <p>From input to actionable analysis in seconds.</p>
        </div>
        <div className="steps-grid">
          {steps.map((s) => (
            <div key={s.step} className="step-card">
              <div className="step-number">{s.step}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Start analyzing your changes today</h2>
          <p>Free to use. No credit card required. Your data stays private.</p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/analyze" className="btn btn-primary btn-lg">Analyze a Change →</Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">Create Free Account →</Link>
                <Link to="/login" className="btn btn-secondary btn-lg">Login</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="landing-brand">
            <ShieldIcon />
            <span>ChangeGuard <span className="brand-ai">AI</span></span>
          </div>
          <p>Built for IBM Bob Hackathon 2.0 · AI-powered change management platform</p>
        </div>
      </footer>
    </div>
  );
}
