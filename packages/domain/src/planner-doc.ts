export interface PlannerOutlineDoc {
  projectTitle: string;
  contentType: 'drama' | 'mv' | 'knowledge';
  subtype: string;
  format: 'single' | 'series';
  episodeCount: number;
  targetDurationSeconds?: number;
  genre: string;
  toneStyle: string[];
  premise: string;
  mainCharacters: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
  }>;
  storyArc: Array<{
    episodeNo: number;
    title: string;
    summary: string;
  }>;
  constraints: string[];
  openQuestions: string[];
}

export interface PlannerStructuredEntity {
  entityKey?: string;
  entityType?: 'subject' | 'scene';
  semanticFingerprint?: string;
  title: string;
  prompt: string;
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
}

export interface PlannerStructuredShot {
  entityKey?: string;
  title: string;
  visual: string;
  composition: string;
  motion: string;
  voice: string;
  line: string;
  targetModelFamilySlug?: string;
  subjectBindings?: string[];
  referenceAssetIds?: string[];
  generatedAssetIds?: string[];
}

export interface PlannerStructuredAct {
  title: string;
  time: string;
  location: string;
  shots: PlannerStructuredShot[];
}

export interface PlannerStructuredDoc {
  projectTitle: string;
  episodeTitle: string;
  episodeCount: number;
  pointCost: number;
  summaryBullets: string[];
  highlights: Array<{ title: string; description: string }>;
  styleBullets: string[];
  subjectBullets: string[];
  subjects: PlannerStructuredEntity[];
  sceneBullets: string[];
  scenes: PlannerStructuredEntity[];
  scriptSummary: string[];
  acts: PlannerStructuredAct[];
}
