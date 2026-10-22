import { useEffect, useState, useCallback } from 'react';
import { Search, CheckCircle2, Circle, Trash2, Edit3, X, Save, MessageSquare, Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTasks, updateTask, deleteTask, draftFollowUp } from '../services/api';
import type { Task } from '../types';

type FilterStatus = 'all' | 'pending' | 'completed';
type FilterPriority = 'all' | 'high' | 'medium' | 'low';
type SortField = 'created_at' | 'priority' | 'due_date' | 'title';

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ title: string; description: string; priority: string; due_date: string }>({ title: '', description: '', priority: '', due_date: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Follow-up
  const [followUpTaskId, setFollowUpTaskId] = useState<number | null>(null);
  const [followUpTone, setFollowUpTone] = useState('professional');
  const [followUpDraft, setFollowUpDraft] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { sort_by: sortField, sort_order: 'desc' };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;
      if (search.trim()) params.search = search.trim();
      const data = await getTasks(params);
      setTasks(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterPriority, sortField]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleToggleStatus(task: Task) {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      await updateTask(task.id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as Task['status'] } : t));
      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task.');
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date || '',
    });
  }

  async function handleSaveEdit() {
    if (!editingId || !editData.title.trim()) return;
    try {
      const updated = await updateTask(editingId, {
        title: editData.title.trim(),
        description: editData.description || undefined,
        priority: editData.priority,
        due_date: editData.due_date || undefined,
      });
      setTasks(prev => prev.map(t => t.id === editingId ? updated : t));
      setEditingId(null);
      toast.success('Task updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save task.');
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      setDeleteConfirmId(null);
      toast.success('Task deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task.');
    }
  }

  async function handleFollowUp(task: Task) {
    setFollowUpTaskId(task.id);
    setFollowUpDraft('');
    setFollowUpLoading(true);
    try {
      const context = [task.title, task.description, task.source_context].filter(Boolean).join('\n');
      const result = await draftFollowUp(context, task.title, followUpTone);
      setFollowUpDraft(result.draft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate follow-up.');
    } finally {
      setFollowUpLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Task Manager</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <select className="input select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)} style={{ width: 'auto', flex: '0 0 auto' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
        <select className="input select" value={filterPriority} onChange={e => setFilterPriority(e.target.value as FilterPriority)} style={{ width: 'auto', flex: '0 0 auto' }}>
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="input select" value={sortField} onChange={e => setSortField(e.target.value as SortField)} style={{ width: 'auto', flex: '0 0 auto' }}>
          <option value="created_at">Newest</option>
          <option value="priority">Priority</option>
          <option value="due_date">Due Date</option>
          <option value="title">Title</option>
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="card empty-state" style={{ padding: '3rem' }}>
          <CheckCircle2 size={40} />
          <h3>No tasks found</h3>
          <p>{search || filterStatus !== 'all' || filterPriority !== 'all'
            ? 'Try adjusting your filters or search query.'
            : 'Analyze some text in the Smart Inbox to extract tasks.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tasks.map(task => (
            <div key={task.id} className="card" style={{ padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
              {editingId === task.id ? (
                /* Edit Mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input className="input" value={editData.title} onChange={e => setEditData(d => ({ ...d, title: e.target.value }))} placeholder="Task title" />
                  <textarea className="input" value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} placeholder="Description" rows={2} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select className="input select" value={editData.priority} onChange={e => setEditData(d => ({ ...d, priority: e.target.value }))} style={{ flex: 1 }}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <input className="input" value={editData.due_date} onChange={e => setEditData(d => ({ ...d, due_date: e.target.value }))} placeholder="Due date" style={{ flex: 1 }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}><X size={14} /> Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}><Save size={14} /> Save</button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleToggleStatus(task)}
                    title={task.status === 'pending' ? 'Mark complete' : 'Mark pending'}
                    style={{ padding: '0.25rem', marginTop: 2 }}
                  >
                    {task.status === 'completed'
                      ? <CheckCircle2 size={20} color="var(--color-success)" />
                      : <Circle size={20} color="var(--color-text-muted)" />}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontWeight: 500,
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        color: task.status === 'completed' ? 'var(--color-text-muted)' : 'var(--color-text)',
                      }}>
                        {task.title}
                      </span>
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      {task.due_date && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>📅 {task.due_date}</span>}
                      {task.category && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-alt)', padding: '0.125rem 0.375rem', borderRadius: 4 }}>{task.category}</span>}
                    </div>
                    {task.description && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{task.description}</p>
                    )}
                    {task.source_context && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        Source: "{task.source_context}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleFollowUp(task)} title="Draft follow-up">
                      <MessageSquare size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(task)} title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirmId(task.id)} title="Delete" style={{ color: 'var(--color-danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Follow-up panel */}
              {followUpTaskId === task.id && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Tone:</span>
                    {(['professional', 'friendly', 'concise'] as const).map(t => (
                      <button key={t} className={`btn btn-sm ${followUpTone === t ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setFollowUpTone(t); handleFollowUp(task); }}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={() => setFollowUpTaskId(null)} style={{ marginLeft: 'auto' }}><X size={14} /></button>
                  </div>
                  {followUpLoading ? (
                    <div style={{ padding: '1rem', textAlign: 'center' }}><Loader2 size={16} className="spinner" /> Generating...</div>
                  ) : followUpDraft ? (
                    <div style={{ position: 'relative' }}>
                      <textarea className="input" value={followUpDraft} onChange={e => setFollowUpDraft(e.target.value)} rows={4} />
                      <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(followUpDraft); toast.success('Copied!'); }}
                        style={{ position: 'absolute', top: 8, right: 8 }}>
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Delete Task</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirmId)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
