import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './AnalysisPage.css';

const riskColors = {
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
  critical: 'badge-critical',
};

const riskBarWidth = { low: '25%', medium: '50%', high: '75%', critical: '100%' };
const riskBarColor = {
  low: 'var(--risk-low)',
  medium: 'var(--risk-medium)',
  high: 'var(--risk-high)',
  critical: 'var(--risk-critical)',
};

const severityColors = {
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
};

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [input, setInput] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Load existing analysis if id param present
  useEffect(() => {
    if (id) {
      setLoadingExisting(true);
      api.get(`/analyses/${id}`)
        .then(({ data }) => setAnalysis(data))
        .catch(() => toast.error('Analysis not found.'))
        .finally(() => setLoadingExisting(false));
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      toast.error('Please enter a change request.');
      return;
    }
    if (trimmed.length < 10) {
      toast.error('Please provide more detail (at least 10 characters).');
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const { data } = await api.post('/analyses', { inputText: trimmed });
      setAnalysis(data);
      toast.success('Analysis complete!');
      // Update URL to this analysis without triggering reload
      navigate(`/history/${data.id}`, { replace: false });
    } catch (err) {
      const msg = err.response?.data?.error || 'Analysis failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!analysis?.id) return;
    if (!window.confirm('Delete this analysis? This cannot be undone.')) return;
    try {
      await api.delete(`/analyses/${analysis.id}`);
      toast.success('Analysis deleted.');
      navigate('/history');
    } catch {
      toast.error('Failed to delete analysis.');
    }
  };

  const handleNewAnalysis = () => {
    setAnalysis(null);
    setInput('');
    navigate('/analyze');
  };

  const result = analysis?.result;

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="analysis-main">
        <div className="container">
          {/* Input section — shown when no active analysis or when on /analyze */}
          {!id || !analysis ? (
            <div className="analysis-input-section">
              <div className="analysis-input-header">
                <h1>🔍 ChangeGuard AI Analyzer</h1>
                <p>Enter a change request, deployment description, or system update to receive an instant AI risk assessment.</p>
              </div>

              {loadingExisting ? (
                <div className="loading-center"><div className="spinner spinner-lg" /></div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="card analysis-input-card">
                    <div className="form-group">
                      <label htmlFor="changeInput">Change Request Description</label>
                      <textarea
                        id="changeInput"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Example: Deploy new API version v2.3.1 to production. This includes database schema changes, new authentication endpoints, and updated rate limiting configurations..."
                        rows={6}
                        disabled={loading}
                        maxLength={5000}
                      />
                      <div className="char-count">{input.length}/5000 characters</div>
                    </div>

                    {/* Example prompts */}
                    <div className="example-prompts">
                      <div className="example-label">Quick examples:</div>
                      <div className="prompt-chips">
                        {[
                          'Deploy new API version to production with database migration',
                          'Update SSL/TLS certificates on load balancer',
                          'Migrate PostgreSQL database to new server',
                          'Roll out new user authentication system',
                          'Apply security patch to Linux servers',
                          'Change production environment variables',
                        ].map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            className="prompt-chip"
                            onClick={() => setInput(ex)}
                            disabled={loading}
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="analysis-actions">
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading || !input.trim()}
                      >
                        {loading ? (
                          <><span className="spinner" /> Analyzing with AI...</>
                        ) : (
                          '🔍 Analyze Change'
                        )}
                      </button>
                      {loading && (
                        <span className="analysis-hint">This may take a few seconds...</span>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>
          ) : null}

          {/* Results section */}
          {analysis && result && (
            <div className="analysis-results">
              {/* Header */}
              <div className="results-header">
                <div className="results-title-row">
                  <div>
                    <h1>{result.title || analysis.title}</h1>
                    {analysis.createdAt && (
                      <p className="results-date">
                        Analyzed {format(new Date(analysis.createdAt), 'MMM d, yyyy · h:mm a')}
                      </p>
                    )}
                  </div>
                  <div className="results-header-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleNewAnalysis}>
                      + New Analysis
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                      Delete
                    </button>
                  </div>
                </div>

                {result.demoMode && (
                  <div className="alert alert-info mt-2">
                    ℹ️ <strong>Demo Mode:</strong> OpenAI API key not configured. Results are intelligently generated from built-in analysis patterns. Configure <code>OPENAI_API_KEY</code> for live AI.
                  </div>
                )}
              </div>

              {/* Risk Overview */}
              <div className="risk-overview">
                <div className="card risk-score-card">
                  <div className="risk-score-label">Risk Level</div>
                  <span className={`badge badge-xl ${riskColors[result.riskLevel] || 'badge-medium'}`}>
                    {result.riskLevel?.toUpperCase() || 'MEDIUM'}
                  </span>
                  <div className="risk-bar-wrap">
                    <div
                      className="risk-bar-fill"
                      style={{
                        width: riskBarWidth[result.riskLevel] || '50%',
                        background: riskBarColor[result.riskLevel] || 'var(--risk-medium)',
                      }}
                    />
                  </div>
                  <div className="risk-score-val">
                    Score: <strong>{result.riskScore || '—'}</strong>/10
                  </div>
                </div>

                <div className="card change-meta-card">
                  <div className="meta-row">
                    <span className="meta-key">Category</span>
                    <span className="meta-val">{result.changeCategory || '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-key">Downtime</span>
                    <span className="meta-val">{result.estimatedDowntime || '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-key">Approval</span>
                    <span className="meta-val" style={{ fontSize: '13px' }}>{result.approvalConsiderations || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="card">
                <h2>📋 Change Summary</h2>
                <p className="result-summary">{result.summary}</p>

                {result.impactAreas?.length > 0 && (
                  <div className="impact-areas">
                    <div className="impact-label">Impact Areas:</div>
                    <div className="impact-chips">
                      {result.impactAreas.map((area) => (
                        <span key={area} className="impact-chip">{area}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Potential Risks */}
              {result.potentialRisks?.length > 0 && (
                <div className="card">
                  <h2>⚠️ Potential Risks</h2>
                  <div className="risks-list">
                    {result.potentialRisks.map((r, i) => (
                      <div key={i} className="risk-item">
                        <div className="risk-item-main">
                          <span className="risk-item-text">{r.risk}</span>
                          <span className={`badge badge-sm ${severityColors[r.severity] || 'badge-medium'}`}>
                            {r.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations + Required Checks */}
              <div className="results-two-col">
                {result.recommendations?.length > 0 && (
                  <div className="card">
                    <h2>✅ Recommendations</h2>
                    <ul className="checklist">
                      {result.recommendations.map((r, i) => (
                        <li key={i}><span className="check-icon">→</span> {r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.requiredChecks?.length > 0 && (
                  <div className="card">
                    <h2>☑️ Required Checks</h2>
                    <ul className="checklist">
                      {result.requiredChecks.map((c, i) => (
                        <li key={i}><span className="check-icon">□</span> {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Mitigation + Rollback */}
              <div className="results-two-col">
                {result.mitigationStrategies?.length > 0 && (
                  <div className="card">
                    <h2>🛡️ Mitigation Strategies</h2>
                    <ul className="checklist">
                      {result.mitigationStrategies.map((m, i) => (
                        <li key={i}><span className="check-icon">→</span> {m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.rollbackPlan && (
                  <div className="card rollback-card">
                    <h2>↩️ Rollback Plan</h2>
                    <p>{result.rollbackPlan}</p>
                  </div>
                )}
              </div>

              {/* Original Input */}
              <div className="card input-echo-card">
                <h3>Original Change Request</h3>
                <p className="input-echo">{analysis.inputText}</p>
              </div>

              {/* Bottom Actions */}
              <div className="results-bottom-actions">
                <button className="btn btn-primary" onClick={handleNewAnalysis}>
                  + Analyze Another Change
                </button>
                <Link to="/history" className="btn btn-secondary">View History</Link>
                <button className="btn btn-danger" onClick={handleDelete}>Delete Analysis</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
