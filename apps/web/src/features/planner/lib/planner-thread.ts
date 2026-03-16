export interface PlannerThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  messageType: string;
  content: string;
  rawContent?: Record<string, unknown> | null;
  createdAt?: string;
}
