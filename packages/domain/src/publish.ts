export interface PublishDraft {
  title: string;
  intro: string;
  script: string;
  tag: string;
  status: 'draft' | 'submitted';
}

export interface PublishWorkspace {
  draft: PublishDraft;
  successMessage: string;
}
