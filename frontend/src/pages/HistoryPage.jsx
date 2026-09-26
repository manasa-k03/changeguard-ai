import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday, subDays, isAfter } from 'date-fns';
import './HistoryPage.css';

const riskColors = {
  low: 'badge-low',
  medium: 'badge-medium',
  high: 'badge-high',
  critical: 'badge-critical',
};

const groupAnalyses = (analyses) => {
  const groups = {};
  const now = new Date();

  analyses.forEach((a) => {
    const d = new Date(a.created_at);
    let label;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else if (isAfter(d, subDays(now, 7))) label = 'This Week';
    else if (isAfter(d, subDays(now, 30))) label = 'This Month';
    else label = format(d, 'MMMM yyyy');

    if (!groups[label]) groups[label] = [];
    groups[label].push(a);
  });

  return groups;
};

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    try {
      const { data } = await api.get('/analyses');
      setAnalyses(data.analyses || []);
    } catch {
      toast.error('Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this analysis?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/analyses/${id}`);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast.success('Analysis deleted.');
    } catch {
      toast.error('Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear ALL history? This cannot be undone.')) return;
    setClearingAll(true);
    try {
      await api.delete('/analyses');
      setAnalyses([]);
      toast.success('History cleared.');
    } catch {
      toast.error('Failed to clear history.');
    } finally {
      setClearingAll(false);
    }
  };

  const groups = groupAnalyses(analyses);

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="history-main">
        <div className="container">
          <div className="history-header">
            <div>
              <h1>Analysis History</h1>
              <p>All your previous ChangeGuard AI analyses — saved and private to your account.</p>
            </div>
            <div className="history-header-actions">
              <Link to="/analyze" className="btn btn-primary">+ New Analysis</Link>
              {analyses.length > 0 && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleClearAll}
                  disabled={clearingAll}
                >
                  {clearingAll ? 'Clearing...' : 'Clear All'}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner spinner-lg" />
              <p>Loading history...</p>
            </div>
          ) : analyses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No analyses yet</h3>
              <p>Run your first change analysis to see it here.</p>
              <Link to="/analyze" className="btn btn-primary mt-4">Analyze Your First Change</Link>
            </div>
          ) : (
            <div className="history-groups">
              {Object.entries(groups).map(([label, items]) => (
                <div key={label} className="history-group">
                  <div className="history-group-label">{label}</div>
                  <div className="history-cards">
                    {items.map((a) => (
                      <Link key={a.id} to={`/history/${a.id}`} className="history-card">
                        <div className="history-card-main">
                          <div className="history-card-info">
                            <div className="history-card-title">{a.title}</div>
                            <div className="history-card-meta">
                              {format(new Date(a.created_at), 'MMM d, yyyy · h:mm a')}
                            </div>
                          </div>
                          <div className="history-card-right">
                            <span className={`badge ${riskColors[a.risk_level] || 'badge-medium'}`}>
                              {a.risk_level}
                            </span>
                            <button
                              className="btn btn-ghost btn-icon delete-btn"
                              title="Delete"
                              onClick={(e) => handleDelete(e, a.id)}
                              disabled={deletingId === a.id}
                            >
                              {deletingId === a.id ? (
                                <span className="spinner" style={{ width: '14px', height: '14px' }} />
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3,6 5,6 21,6" />
                                  <path d="M19,6l-1,14H6L5,6" />
                                  <path d="M10,11v6M14,11v6" />
                                  <path d="M9,6V4h6v2" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="history-card-snippet">
                          {a.input_text?.substring(0, 120)}{a.input_text?.length > 120 ? '…' : ''}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
