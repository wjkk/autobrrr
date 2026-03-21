import { requestCatalogEnvelope } from './request';
import type { SubjectDraft } from '../../components/catalog-management-editor-types';

export async function uploadCatalogSubjectImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const result = await requestCatalogEnvelope<{ imageUrl: string }>('/api/explore/subjects/upload-image', {
    method: 'POST',
    body: formData,
  });

  return result.imageUrl;
}

export async function generateCatalogSubjectImage(input: {
  name: string;
  subjectType: SubjectDraft['subjectType'];
  description: string;
}) {
  const result = await requestCatalogEnvelope<{ imageUrl: string }>('/api/explore/subjects/generate-image', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return result.imageUrl;
}
