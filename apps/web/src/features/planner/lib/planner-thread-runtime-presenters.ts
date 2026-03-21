import type { PlannerThreadMessage } from './planner-thread';

export function readPlannerThreadSteps(rawContent: PlannerThreadMessage['rawContent']) {
  return Array.isArray(rawContent?.steps)
    ? rawContent.steps
        .map((step) => (step && typeof step === 'object' && !Array.isArray(step) ? (step as Record<string, unknown>) : null))
        .filter((step): step is Record<string, unknown> => step !== null)
    : [];
}

export function readPlannerThreadOutlineDoc(rawContent: PlannerThreadMessage['rawContent']) {
  return rawContent?.outlineDoc
    && typeof rawContent.outlineDoc === 'object'
    && !Array.isArray(rawContent.outlineDoc)
    ? (rawContent.outlineDoc as Record<string, unknown>)
    : null;
}

export function readPlannerThreadReceiptTitle(args: {
  messageType: string;
  rawContent: PlannerThreadMessage['rawContent'];
  runtimeDocumentTitle: string | null;
}) {
  const { messageType, rawContent, runtimeDocumentTitle } = args;
  if (messageType !== 'assistant_document_receipt') {
    return runtimeDocumentTitle;
  }

  return typeof rawContent?.documentTitle === 'string'
    ? rawContent.documentTitle
    : runtimeDocumentTitle;
}

export function readPlannerThreadDiffSummary(rawContent: PlannerThreadMessage['rawContent']) {
  return Array.isArray(rawContent?.diffSummary)
    ? rawContent.diffSummary.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
    : [];
}

export function readPlannerThreadReceiptDebugRunId(rawContent: PlannerThreadMessage['rawContent']) {
  return typeof rawContent?.debugRunId === 'string' && rawContent.debugRunId.trim().length > 0
    ? rawContent.debugRunId.trim()
    : null;
}
