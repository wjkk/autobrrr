import type { ProjectContentMode } from '@aiv/domain';
import { createRuntimeStudioFixture, listMockStudioProjects } from '@aiv/mock-data';
import { NextResponse } from 'next/server';

interface CreateProjectPayload {
  prompt?: unknown;
  contentMode?: unknown;
}

function normalizeContentMode(value: unknown): ProjectContentMode {
  if (value === 'series') {
    return 'series';
  }

  return 'single';
}

export async function GET() {
  return NextResponse.json({ ok: true, data: listMockStudioProjects() });
}

export async function POST(request: Request) {
  let payload: CreateProjectPayload = {};

  try {
    payload = (await request.json()) as CreateProjectPayload;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid JSON payload.',
        },
      },
      { status: 400 },
    );
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'PROMPT_REQUIRED',
          message: 'Prompt is required.',
        },
      },
      { status: 400 },
    );
  }

  const studio = createRuntimeStudioFixture({
    prompt,
    contentMode: normalizeContentMode(payload.contentMode),
  });

  return NextResponse.json({
    ok: true,
    data: {
      projectId: studio.project.id,
      redirectUrl: `/projects/${studio.project.id}/planner`,
      project: {
        id: studio.project.id,
        title: studio.project.title,
        contentMode: studio.project.contentMode,
        status: studio.project.status,
      },
    },
  });
}
