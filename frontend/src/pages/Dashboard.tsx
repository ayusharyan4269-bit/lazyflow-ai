import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, CheckCircle2, Clock, ArrowRight, Inbox, Zap } from 'lucide-react';
import { getTaskStats, getTasks, getDocuments } from '../services/api';
import type { TaskStats, Task, DocumentListItem } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<TaskStats>({ total: 0, pending: 0, completed: 0, high_priority: 0 });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentDocs, setRecentDocs] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [s, t, d] = await Promise.all([
        getTaskStats(),
        getTasks({ sort_by: 'created_at', sort_order: 'desc' }),
        getDocuments(),
      ]);
      setStats(s);
      setRecentTasks(t.slice(0, 5));
      setRecentDocs(d.slice(0, 5));
    } catch {
      // Silent failure on dashboard load
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Total Tasks', value: stats.total, icon: LayoutDashboard, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { label: 'High Priority', value: stats.high_priority, icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  ];

  const hasData = stats.total > 0 || recentDocs.length > 0;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Dashboard</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Your productivity overview at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <div className="stat-value" style={{ color }}>{loading ? '—' : value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {!hasData && !loading ? (
        /* Empty State / Onboarding */
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Zap size={28} color="#818cf8" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Welcome to LazyFlow AI</h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: 480, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Stop repeating yourself. Paste your notes, meeting discussions, or project updates and let AI extract the action items, summarize key points, and draft follow-ups.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/inbox')}>
              <Inbox size={16} /> Analyze Your First Text
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/inbox?demo=true')}>
              Try Demo
            </button>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Paste messy notes', 'AI extracts tasks', 'Review & save', 'Track progress'].map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--color-surface-alt)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-light)',
                }}>
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Content */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Recent Tasks */}
          <div className="card" style={{ gridColumn: recentDocs.length === 0 ? '1 / -1' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Tasks</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
                View all <ArrowRight size={14} />
              </button>
            </div>
            {recentTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <CheckCircle2 size={32} />
                <h3>No tasks yet</h3>
                <p>Analyze some text to extract action items</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentTasks.map(task => (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 0.75rem', borderRadius: 8,
                    background: 'var(--color-bg)', fontSize: '0.875rem',
                  }}>
                    <span className={`badge badge-${task.priority}`} style={{ minWidth: 52, justifyContent: 'center' }}>
                      {task.priority}
                    </span>
                    <span style={{
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      color: task.status === 'completed' ? 'var(--color-text-muted)' : 'var(--color-text)',
                    }}>
                      {task.title}
                    </span>
                    {task.due_date && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {task.due_date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Documents */}
          {recentDocs.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Sources</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentDocs.map(doc => (
                  <div key={doc.id} style={{
                    padding: '0.625rem 0.75rem', borderRadius: 8,
                    background: 'var(--color-bg)', fontSize: '0.875rem',
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{doc.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.content_preview}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Action */}
      {hasData && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/inbox')}>
            <Inbox size={16} /> Analyze New Text
          </button>
        </div>
      )}
    </div>
  );
}
