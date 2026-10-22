import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Trash2, Shield, HardDrive, Cpu, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAIStatus, clearWorkspace } from '../services/api';
import type { AIStatus } from '../types';

export default function Settings() {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    checkAIStatus();
  }, []);

  async function checkAIStatus() {
    setChecking(true);
    try {
      const status = await getAIStatus();
      setAiStatus(status);
    } catch (err) {
      setAiStatus({
        provider: 'ollama',
        model: 'unknown',
        base_url: 'http://localhost:11434',
        available: false,
        message: err instanceof Error ? err.message : 'Failed to check AI status.',
      });
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  async function handleClearWorkspace() {
    setClearing(true);
    try {
      await clearWorkspace();
      toast.success('Workspace cleared. All data has been deleted.');
      setShowClearConfirm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear workspace.');
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Model configuration, privacy, and data management
        </p>
      </div>

      {/* AI Model Status */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} /> AI Model
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={checkAIStatus} disabled={checking}>
            {checking ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
            Test Connection
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Checking AI status...</p>
          </div>
        ) : aiStatus ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Status indicator */}
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 8,
              background: aiStatus.available ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${aiStatus.available ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              {aiStatus.available
                ? <Wifi size={18} color="#22c55e" />
                : <WifiOff size={18} color="#ef4444" />}
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: aiStatus.available ? '#4ade80' : '#f87171' }}>
                  {aiStatus.available ? 'Model Ready' : 'Model Unavailable'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-line' }}>
                  {aiStatus.message}
                </div>
              </div>
            </div>

            {/* Config details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'Provider', value: aiStatus.provider },
                { label: 'Model', value: aiStatus.model },
                { label: 'Base URL', value: aiStatus.base_url },
                { label: 'Status', value: aiStatus.available ? 'Connected' : 'Disconnected' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--color-bg)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.125rem' }}>{label}</div>
                  <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Setup instructions when unavailable */}
            {!aiStatus.available && (
              <div style={{
                padding: '0.875rem', borderRadius: 8, background: 'var(--color-bg)',
                border: '1px solid var(--color-border)', fontSize: '0.8125rem',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <AlertTriangle size={14} /> Setup Instructions
                </div>
                <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
                  <li>Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-light)' }}>ollama.ai</a></li>
                  <li>Open a terminal and run: <code style={{ background: 'var(--color-surface-alt)', padding: '0.125rem 0.375rem', borderRadius: 4 }}>ollama serve</code></li>
                  <li>Pull the model: <code style={{ background: 'var(--color-surface-alt)', padding: '0.125rem 0.375rem', borderRadius: 4 }}>ollama pull {aiStatus.model}</code></li>
                  <li>Click "Test Connection" above to verify</li>
                </ol>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Privacy & Data */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Shield size={18} /> Privacy & Data Handling
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', lineHeight: 1.7 }}>
          {[
            { icon: '🏠', text: 'All AI processing happens locally via Ollama. Your text is never sent to external cloud APIs.' },
            { icon: '💾', text: 'Tasks and documents are stored in a local SQLite database on your machine.' },
            { icon: '🚫', text: 'No analytics, telemetry, or tracking is included in this application.' },
            { icon: '🔒', text: 'No user accounts, authentication, or personal information is collected.' },
            { icon: '🌐', text: 'The only network requests are to your local Ollama instance (localhost:11434 by default).' },
            { icon: '📂', text: 'Database location: backend/app/data/lazyflow.db' },
          ].map(({ icon, text }, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', color: 'var(--color-text-secondary)' }}>
              <span style={{ flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <HardDrive size={18} /> Data Management
        </h2>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          Clear all stored tasks, source documents, and analysis history. This action cannot be undone.
        </p>

        <button
          className="btn btn-danger"
          onClick={() => setShowClearConfirm(true)}
        >
          <Trash2 size={14} /> Clear All Data
        </button>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#f87171' }}>
              ⚠️ Clear All Data
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              This will permanently delete all tasks, source documents, and analysis history from your local database.
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowClearConfirm(false)} disabled={clearing}>Cancel</button>
              <button className="btn btn-danger" onClick={handleClearWorkspace} disabled={clearing}>
                {clearing ? <Loader2 size={14} className="spinner" /> : <Trash2 size={14} />}
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
