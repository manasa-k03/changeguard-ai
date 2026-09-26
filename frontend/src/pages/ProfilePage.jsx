import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analysesRes, meRes] = await Promise.all([
          api.get('/analyses'),
          api.get('/auth/me'),
        ]);
        const analyses = analysesRes.data.analyses || [];
        setStats({
          total: analyses.length,
          high: analyses.filter((a) => a.risk_level === 'high' || a.risk_level === 'critical').length,
          medium: analyses.filter((a) => a.risk_level === 'medium').length,
          low: analyses.filter((a) => a.risk_level === 'low').length,
        });
        setAccountInfo(meRes.data.user);
      } catch {
        // non-critical, just show user data
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/');
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="profile-main">
        <div className="container">
          <div className="profile-grid">
            {/* Account Info */}
            <div className="card profile-card">
              <div className="profile-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <h1 className="profile-name">{user?.name}</h1>
              <p className="profile-email">{user?.email}</p>

              {accountInfo?.created_at && (
                <p className="profile-joined">
                  Member since {format(new Date(accountInfo.created_at), 'MMMM d, yyyy')}
                </p>
              )}

              <div className="divider" />

              <div className="profile-info-list">
                <div className="profile-info-row">
                  <span className="profile-info-key">Name</span>
                  <span className="profile-info-val">{user?.name}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-key">Email</span>
                  <span className="profile-info-val">{user?.email}</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-key">Account ID</span>
                  <span className="profile-info-val profile-id">{user?.id}</span>
                </div>
              </div>

              <div className="divider" />

              <button
                className="btn btn-danger w-full"
                onClick={handleLogout}
                style={{ justifyContent: 'center' }}
              >
                Logout
              </button>
            </div>

            {/* Usage Stats */}
            <div className="profile-side">
              <div className="card">
                <h2>Analysis Statistics</h2>
                {loading ? (
                  <div className="loading-row"><div className="spinner" /> Loading stats...</div>
                ) : stats ? (
                  <div className="stats-list">
                    <div className="stats-list-item">
                      <span>Total Analyses</span>
                      <span className="stat-num">{stats.total}</span>
                    </div>
                    <div className="stats-list-item">
                      <span style={{ color: 'var(--risk-high)' }}>High/Critical Risk</span>
                      <span className="stat-num" style={{ color: 'var(--risk-high)' }}>{stats.high}</span>
                    </div>
                    <div className="stats-list-item">
                      <span style={{ color: 'var(--risk-medium)' }}>Medium Risk</span>
                      <span className="stat-num" style={{ color: 'var(--risk-medium)' }}>{stats.medium}</span>
                    </div>
                    <div className="stats-list-item">
                      <span style={{ color: 'var(--risk-low)' }}>Low Risk</span>
                      <span className="stat-num" style={{ color: 'var(--risk-low)' }}>{stats.low}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted text-sm">No analyses yet.</p>
                )}
              </div>

              <div className="card">
                <h2>Security</h2>
                <ul className="security-list">
                  <li>✅ Password stored with bcrypt (12 rounds)</li>
                  <li>✅ Session managed with JWT token</li>
                  <li>✅ All API calls require authentication</li>
                  <li>✅ Data is private to your account only</li>
                  <li>✅ Credentials never exposed in frontend</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
