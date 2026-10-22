export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  due_date: string | null;
  category: string | null;
  source_context: string | null;
  source_document_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  priority?: string;
  due_date?: string | null;
  category?: string | null;
  source_context?: string | null;
  source_document_id?: number | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  due_date?: string | null;
  category?: string;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListItem {
  id: number;
  title: string;
  category: string | null;
  content_preview: string;
  created_at: string;
}

export interface ExtractedTask {
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  category: string | null;
  source_context: string | null;
}

export interface AnalyzeResponse {
  summary: string;
  tasks: ExtractedTask[];
  key_info: string[];
  document_id: number;
}

export interface SummarizeResponse {
  summary: string;
  style: string;
}

export interface FollowUpResponse {
  draft: string;
  tone: string;
}

export interface AIStatus {
  provider: string;
  model: string;
  base_url: string;
  available: boolean;
  message: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  high_priority: number;
}
