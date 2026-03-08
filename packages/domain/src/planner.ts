import type { PlannerStatus, PlannerStepStatus } from './shared';

export interface PlannerStep {
  id: string;
  title: string;
  status: PlannerStepStatus;
}

export interface PlannerMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface PlannerReference {
  id: string;
  title: string;
  prompt: string;
  modelId: string;
  variantLabel: string;
}

export interface StoryboardDraft {
  id: string;
  title: string;
  visualPrompt: string;
  compositionPrompt: string;
  motionPrompt: string;
}

export interface PlannerWorkspace {
  input: string;
  submittedRequirement: string;
  status: PlannerStatus;
  docProgressPercent: number;
  pointCost: number;
  sections: Array<{ id: string; title: string; open: boolean }>;
  steps: PlannerStep[];
  messages: PlannerMessage[];
  references: PlannerReference[];
  storyboards: StoryboardDraft[];
}
