import type {
  Task, TaskCreate, TaskUpdate, TaskStats,
  DocumentListItem, Document,
  AnalyzeResponse, SummarizeResponse, FollowUpResponse, AIStatus,
} from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    if (res.status === 204) return undefined as T;

    const data = await res.json();

    if (!res.ok) {
      throw new ApiError(
        data.detail || `Request failed (${res.status})`,
        res.status
      );
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new ApiError('Cannot connect to the backend server. Is it running?', 0);
    }
    throw err;
  }
}

// Health
export const getHealth = () => request<{ status: string; version: string }>('/health');

// AI
export const getAIStatus = () => request<AIStatus>('/ai/status');

export const analyzeText = (title: string, content: string, category?: string) =>
  request<AnalyzeResponse>('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ title, content, category }),
  });

export const summarizeText = (content: string, style: string) =>
  request<SummarizeResponse>('/ai/summarize', {
    method: 'POST',
    body: JSON.stringify({ content, style }),
  });

export const draftFollowUp = (context: string, taskTitle?: string, tone?: string) =>
  request<FollowUpResponse>('/ai/draft-followup', {
    method: 'POST',
    body: JSON.stringify({ context, task_title: taskTitle, tone: tone || 'professional' }),
  });

// Tasks
export const getTasks = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<Task[]>(`/tasks${qs}`);
};

export const getTaskStats = () => request<TaskStats>('/tasks/stats');

export const createTask = (task: TaskCreate) =>
  request<Task>('/tasks', { method: 'POST', body: JSON.stringify(task) });

export const createTasksBatch = (tasks: TaskCreate[]) =>
  request<Task[]>('/tasks/batch', { method: 'POST', body: JSON.stringify(tasks) });

export const updateTask = (id: number, update: TaskUpdate) =>
  request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(update) });

export const deleteTask = (id: number) =>
  request<void>(`/tasks/${id}`, { method: 'DELETE' });

// Documents
export const getDocuments = () => request<DocumentListItem[]>('/documents');

export const getDocument = (id: number) => request<Document>(`/documents/${id}`);

export const deleteDocument = (id: number) =>
  request<void>(`/documents/${id}`, { method: 'DELETE' });

// Workspace
export const clearWorkspace = () =>
  request<{ status: string; message: string }>('/workspace/clear', { method: 'POST' });

export { ApiError };
