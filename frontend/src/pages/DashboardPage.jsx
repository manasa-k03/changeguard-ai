import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import './DashboardPage.css';

const riskColors = {
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
  critical: 'badge-critical',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, high: 0, low: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/analyses');
        const analyses = data.analyses || [];
        setRecentAnalyses(analyses.slice(0, 5));
        setStats({
          total: analyses.length,
          high: analyses.filter((a) => a.risk_level === 'high' || a.risk_level === 'critical').length,
          low: analyses.filter((a) => a.risk_level === 'low').length,
        });
      } catch (err) {
        console.error('Failed to fetch analyses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="dashboard-main">
        <div className="container">
          {/* Welcome Header */}
          <div className="dashboard-header">
            <div>
              <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
              <p>Analyze your changes, review risks, and make informed decisions.</p>
            </div>
            <Link to="/analyze" className="btn btn-primary btn-lg">
              + New Analysis
            </Link>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-card-value">{loading ? '—' : stats.total}</div>
              <div className="stat-card-label">Total Analyses</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color: 'var(--risk-high)' }}>
                {loading ? '—' : stats.high}
              </div>
              <div className="stat-card-label">High Risk Changes</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color: 'var(--risk-low)' }}>
                {loading ? '—' : stats.low}
              </div>
              <div className="stat-card-label">Low Risk Changes</div>
            </div>
          </div>

          {/* Main content area */}
          <div className="dashboard-grid">
            {/* Quick Analyze */}
            <div className="card dashboard-analyze-card">
              <h2>🔍 Analyze a Change</h2>
              <p>Enter any change request, deployment description, or system update to get an instant AI risk assessment.</p>
              <div className="analyze-examples">
                <div className="example-label">Try an example:</div>
                <div className="example-chips">
                  {[
                    'Deploy API v2 to production',
                    'Database schema migration',
                    'Update SSL certificates',
                    'Rollout new authentication system',
                  ].map((ex) => (
                    <Link key={ex} to={`/analyze?q=${encodeURIComponent(ex)}`} className="example-chip">
                      {ex}
                    </Link>
                  ))}
                </div>
              </div>
              <Link to="/analyze" className="btn btn-primary mt-4">
                Open Analyzer →
              </Link>
            </div>

            {/* Recent History */}
            <div className="card">
              <div className="card-header-row">
                <h2>📜 Recent History</h2>
                <Link to="/history" className="btn btn-ghost btn-sm">View all</Link>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner" /> Loading history...
                </div>
              ) : recentAnalyses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <h3>No analyses yet</h3>
                  <p>Run your first analysis to see results here.</p>
                </div>
              ) : (
                <div className="history-list">
                  {recentAnalyses.map((a) => (
                    <Link key={a.id} to={`/history/${a.id}`} className="history-item">
                      <div className="history-item-main">
                        <span className="history-title">{a.title}</span>
                        <span className={`badge ${riskColors[a.risk_level] || 'badge-medium'}`}>
                          {a.risk_level}
                        </span>
                      </div>
                      <div className="history-meta">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
