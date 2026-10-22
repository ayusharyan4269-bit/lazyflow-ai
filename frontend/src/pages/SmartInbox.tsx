import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Loader2, FileText, AlertCircle, CheckCircle2, X, Edit3, Save, Sparkles, Copy, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { analyzeText, summarizeText, draftFollowUp, createTasksBatch } from '../services/api';
import type { ExtractedTask, TaskCreate } from '../types';

const DEMO_TEXT = `Project Meeting Notes - CS 301 Group Assignment
Date: Next Friday (Oct 31)

Participants: Alex, Priya, Jordan, Me

Discussion Summary:
Alex presented the initial database schema. The group agreed to use PostgreSQL for the backend.
Priya raised concerns about the API response times - she suggested we add caching with Redis.
Jordan will handle the frontend React components and needs the API documentation by Wednesday.

Action Items:
- I need to write the API endpoints for user authentication by next Tuesday
- Alex to finalize the database migrations and share with the team
- Priya will research caching strategies and present options at the next meeting
- Everyone should review the project requirements document before the next meeting
- Jordan needs to set up the CI/CD pipeline - this is urgent as we're behind schedule

Important Notes:
- Professor mentioned that late submissions will lose 10% per day
- The project demo is on November 15th - we need a working prototype by November 10th
- Budget for cloud hosting: $50 from the department, need to apply by next Monday
- Alex suggested using Docker for deployment, team agreed

Open Questions:
- Should we use REST or GraphQL? Need to decide by Wednesday
- Who will present at the demo day?
- Do we need user authentication for the MVP?`;

const SUMMARY_STYLES = [
  { value: 'key_points', label: 'Key Points' },
  { value: 'quick_overview', label: 'Quick Overview' },
  { value: 'meeting_summary', label: 'Meeting Summary' },
  { value: 'study_notes', label: 'Study Notes' },
  { value: 'project_update', label: 'Project Update' },
];

const CATEGORIES = ['Lecture', 'Meeting', 'Project', 'Personal', 'Assignment', 'Other'];

export default function SmartInbox() {
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [summaryStyle, setSummaryStyle] = useState('key_points');

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState('');
  const [tasks, setTasks] = useState<(ExtractedTask & { selected: boolean; editing: boolean })[]>([]);
  const [keyInfo, setKeyInfo] = useState<string[]>([]);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'input' | 'results'>('input');

  // Follow-up
  const [followUpContext, setFollowUpContext] = useState('');
  const [followUpTone, setFollowUpTone] = useState('professional');
  const [followUpDraft, setFollowUpDraft] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Saving
  const [saving, setSaving] = useState(false);

  // Summarize separately
  const [reSummarizing, setReSummarizing] = useState(false);

  useEffect(() => {
    if (searchParams.get('demo') === 'true') {
      setTitle('CS 301 Group Project Meeting');
      setContent(DEMO_TEXT);
      setCategory('Meeting');
      toast('📋 Demo data loaded. Click "Analyze" to run AI analysis.', { duration: 4000 });
    }
  }, [searchParams]);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  async function handleAnalyze() {
    if (!title.trim()) { toast.error('Please enter a title.'); return; }
    if (!content.trim()) { toast.error('Please enter some text to analyze.'); return; }
    if (content.length > 50000) { toast.error('Text is too long (max 50,000 characters).'); return; }

    setAnalyzing(true);
    setError('');
    try {
      const result = await analyzeText(title.trim(), content, category || undefined);
      setSummary(result.summary);
      setTasks(result.tasks.map(t => ({ ...t, selected: true, editing: false })));
      setKeyInfo(result.key_info);
      setDocumentId(result.document_id);
      setFollowUpContext(content.substring(0, 2000));
      setPhase('results');
      toast.success(`Found ${result.tasks.length} tasks!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed.';
      setError(message);
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleReSummarize() {
    setReSummarizing(true);
    try {
      const result = await summarizeText(content, summaryStyle);
      setSummary(result.summary);
      toast.success('Summary regenerated!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Summarization failed.');
    } finally {
      setReSummarizing(false);
    }
  }

  async function handleFollowUp() {
    if (!followUpContext.trim()) return;
    setFollowUpLoading(true);
    try {
      const result = await draftFollowUp(followUpContext, undefined, followUpTone);
      setFollowUpDraft(result.draft);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Follow-up drafting failed.');
    } finally {
      setFollowUpLoading(false);
    }
  }

  async function handleSaveTasks() {
    const selected = tasks.filter(t => t.selected);
    if (selected.length === 0) { toast.error('Select at least one task to save.'); return; }

    setSaving(true);
    try {
      const taskData: TaskCreate[] = selected.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        due_date: t.due_date,
        category: t.category,
        source_context: t.source_context,
        source_document_id: documentId,
      }));
      await createTasksBatch(taskData);
      toast.success(`${selected.length} task(s) saved!`);
      // Reset
      setPhase('input');
      setTitle('');
      setContent('');
      setCategory('');
      setSummary('');
      setTasks([]);
      setKeyInfo([]);
      setFollowUpDraft('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save tasks.');
    } finally {
      setSaving(false);
    }
  }

  function updateTask(index: number, field: string, value: string | boolean) {
    setTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  if (phase === 'results') {
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Analysis Results</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
              Review and edit before saving • Source: {title}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => setPhase('input')}>
            ← Back to Input
          </button>
        </div>

        {/* Summary */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="var(--color-primary-light)" /> AI Summary
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                className="input select"
                value={summaryStyle}
                onChange={e => setSummaryStyle(e.target.value)}
                style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.625rem', fontSize: '0.8125rem' }}
              >
                {SUMMARY_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={handleReSummarize} disabled={reSummarizing}>
                {reSummarizing ? <Loader2 size={14} className="spinner" /> : 'Regenerate'}
              </button>
            </div>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {summary}
          </div>
        </div>

        {/* Key Information */}
        {keyInfo.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>📌 Key Information</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {keyInfo.map((info, i) => (
                <li key={i} style={{
                  padding: '0.5rem 0.75rem', borderRadius: 6,
                  background: 'var(--color-bg)', fontSize: '0.875rem',
                  borderLeft: '3px solid var(--color-primary)',
                }}>
                  {info}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Extracted Tasks */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
              Extracted Tasks ({tasks.filter(t => t.selected).length}/{tasks.length} selected)
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setTasks(prev => prev.map(t => ({ ...t, selected: true })))}>Select All</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setTasks(prev => prev.map(t => ({ ...t, selected: false })))}>Deselect All</button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <FileText size={32} />
              <h3>No tasks extracted</h3>
              <p>The AI didn't find actionable tasks in this text.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.map((task, i) => (
                <div key={i} style={{
                  padding: '0.875rem', borderRadius: 10,
                  background: task.selected ? 'var(--color-bg)' : 'transparent',
                  border: `1px solid ${task.selected ? 'var(--color-border)' : 'transparent'}`,
                  opacity: task.selected ? 1 : 0.5,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={task.selected}
                      onChange={e => updateTask(i, 'selected', e.target.checked)}
                      style={{ marginTop: 4, accentColor: 'var(--color-primary)' }}
                      aria-label={`Select task: ${task.title}`}
                    />
                    <div style={{ flex: 1 }}>
                      {task.editing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input
                            className="input"
                            value={task.title}
                            onChange={e => updateTask(i, 'title', e.target.value)}
                            placeholder="Task title"
                          />
                          <textarea
                            className="input"
                            value={task.description || ''}
                            onChange={e => updateTask(i, 'description', e.target.value)}
                            placeholder="Description"
                            rows={2}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select className="input select" value={task.priority} onChange={e => updateTask(i, 'priority', e.target.value)} style={{ flex: 1 }}>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                            <input
                              className="input"
                              value={task.due_date || ''}
                              onChange={e => updateTask(i, 'due_date', e.target.value)}
                              placeholder="Due date (optional)"
                              style={{ flex: 1 }}
                            />
                          </div>
                          <button className="btn btn-secondary btn-sm" onClick={() => updateTask(i, 'editing', false)}>
                            <Save size={14} /> Done Editing
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{task.title}</span>
                            <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                            {task.due_date && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>📅 {task.due_date}</span>}
                          </div>
                          {task.description && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                              {task.description}
                            </p>
                          )}
                          {task.source_context && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              Source: "{task.source_context}"
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {!task.editing && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => updateTask(i, 'editing', true)} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setTasks(prev => prev.filter((_, idx) => idx !== i))} title="Remove">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up Draft */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>✉️ Draft Follow-up</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {(['professional', 'friendly', 'concise'] as const).map(tone => (
              <button
                key={tone}
                className={`btn btn-sm ${followUpTone === tone ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFollowUpTone(tone)}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
            <button className="btn btn-sm btn-primary" onClick={handleFollowUp} disabled={followUpLoading} style={{ marginLeft: 'auto' }}>
              {followUpLoading ? <Loader2 size={14} className="spinner" /> : <Sparkles size={14} />}
              Generate Draft
            </button>
          </div>
          {followUpDraft && (
            <div style={{ position: 'relative' }}>
              <textarea
                className="input"
                value={followUpDraft}
                onChange={e => setFollowUpDraft(e.target.value)}
                rows={6}
                style={{ fontFamily: 'inherit' }}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { navigator.clipboard.writeText(followUpDraft); toast.success('Copied!'); }}
                style={{ position: 'absolute', top: 8, right: 8 }}
              >
                <Copy size={14} /> Copy
              </button>
            </div>
          )}
        </div>

        {/* Save Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', position: 'sticky', bottom: '1rem', background: 'var(--color-bg)', padding: '1rem 0', borderTop: '1px solid var(--color-border)' }}>
          <button className="btn btn-secondary" onClick={() => setPhase('input')}>
            Discard & Start Over
          </button>
          <button className="btn btn-primary" onClick={handleSaveTasks} disabled={saving || tasks.filter(t => t.selected).length === 0}>
            {saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            Save {tasks.filter(t => t.selected).length} Task(s)
          </button>
        </div>
      </div>
    );
  }

  // Input Phase
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Smart Inbox</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Paste your notes, messages, or discussions. AI will extract tasks, generate a summary, and identify key information.
        </p>
      </div>

      <div className="card">
        {/* Title */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="label" htmlFor="inbox-title">Title *</label>
          <input
            id="inbox-title"
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Team meeting notes, Lecture 5 summary..."
            maxLength={200}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="label" htmlFor="inbox-category">Category (optional)</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategory(category === cat ? '' : cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="label" htmlFor="inbox-content">
            Content *
            <span style={{ float: 'right', fontWeight: 400, color: 'var(--color-text-muted)' }}>
              {wordCount} words · {charCount.toLocaleString()} chars
            </span>
          </label>
          <textarea
            id="inbox-content"
            className="input"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste your notes, meeting discussion, project update, or any text you want analyzed..."
            rows={14}
            maxLength={50000}
          />
        </div>

        {error && (
          <div style={{
            padding: '0.75rem', borderRadius: 8, marginBottom: '1rem',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
            color: '#f87171', fontSize: '0.875rem',
          }}>
            <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setTitle('CS 301 Group Project Meeting');
              setContent(DEMO_TEXT);
              setCategory('Meeting');
              toast('📋 Demo data loaded!');
            }}
          >
            Load Demo
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={analyzing || !title.trim() || !content.trim()}
          >
            {analyzing ? (
              <>
                <Loader2 size={16} className="spinner" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Send size={16} />
                Analyze with AI
              </>
            )}
          </button>
        </div>

        {analyzing && (
          <div style={{
            marginTop: '1rem', padding: '1rem', borderRadius: 8,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
            textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem',
          }}>
            <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
            Processing with local AI model... This may take 15-60 seconds depending on text length and hardware.
          </div>
        )}
      </div>
    </div>
  );
}
