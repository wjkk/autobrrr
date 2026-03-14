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
