import json
import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

REPO = Path('/Users/jiankunwu/project/aiv')
API_ENV_PATH = REPO / 'apps/api/.env'
OUT_DIR = Path(os.environ.get('AIV_REAL_PROVIDER_OUT_DIR') or '/tmp/aiv-real-provider-full-planner-e2e')
OUT_DIR.mkdir(parents=True, exist_ok=True)
UI_TIMEOUT_MS = 90000
CLI_SUMMARY_PATH = OUT_DIR / 'cli-summary.json'
FAILURE_SUMMARY_PATH = OUT_DIR / 'failure-summary.json'
PARTIAL_RESULT_PATH = OUT_DIR / 'partial-result.json'

REAL_PROVIDER_EMAIL = os.environ.get('AIV_REAL_PROVIDER_EMAIL') or 'smoke-ark-image-1773673889902@example.com'
REAL_PROVIDER_PASSWORD = os.environ.get('AIV_REAL_PROVIDER_PASSWORD') or 'password123'
PROJECT_PROMPT = os.environ.get('AIV_REAL_PROVIDER_PROJECT_PROMPT') or '写一个都市悬疑短剧大纲：女记者调查失踪录像带，单集，三幕结构。'
REFINEMENT_PROMPT = (
    os.environ.get('AIV_REAL_PROVIDER_REFINEMENT_PROMPT')
    or '请基于当前已确认大纲继续细化成完整策划文档，输出故事梗概、主体、场景和分镜剧本，保持三幕悬疑推进。'
)
TARGET_VIDEO_MODEL_FAMILY_SLUG = os.environ.get('AIV_REAL_PROVIDER_TARGET_VIDEO_MODEL_FAMILY_SLUG') or 'ark-seedance-2-video'


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip()
        if value and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key] = value
    return values


def build_env(**overrides: str) -> dict[str, str]:
    env = os.environ.copy()
    env.update(load_env_file(API_ENV_PATH))
    env.update(overrides)
    return env


def port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(('127.0.0.1', port)) == 0


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(('127.0.0.1', 0))
        sock.listen(1)
        return int(sock.getsockname()[1])


def wait_for_port(port: int, timeout: float = 60.0, process: subprocess.Popen[str] | None = None) -> None:
    started = time.time()
    while time.time() - started < timeout:
        if port_open(port):
            return
        if process is not None and process.poll() is not None:
            raise RuntimeError(f'Process exited before port {port} became ready. Check logs in {OUT_DIR}.')
        time.sleep(0.5)
    raise RuntimeError(f'Port {port} did not open within {timeout} seconds')


def start_server(cmd: list[str], port: int, log_name: str, env: dict[str, str]) -> subprocess.Popen[str]:
    if port_open(port):
        raise RuntimeError(f'Port {port} is already in use before starting {" ".join(cmd)}')

    log_path = OUT_DIR / log_name
    log_handle = open(log_path, 'w', encoding='utf-8')
    process = subprocess.Popen(
        cmd,
        cwd=REPO,
        stdout=log_handle,
        stderr=log_handle,
        preexec_fn=os.setsid,
        env=env,
        text=True,
    )
    process._aiv_log_handle = log_handle  # type: ignore[attr-defined]
    wait_for_port(port, process=process)
    return process


def stop_server(process: subprocess.Popen[str] | None) -> None:
    if process is None:
        return
    try:
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    except ProcessLookupError:
        return
    process.wait(timeout=10)
    log_handle = getattr(process, '_aiv_log_handle', None)
    if log_handle is not None:
        log_handle.close()


def create_project(context, api_base: str, web_base: str) -> tuple[str, str]:
    response = context.request.post(
        f'{web_base}/api/studio/projects',
        headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
        data=json.dumps({
            'prompt': PROJECT_PROMPT,
            'contentMode': 'single',
            'creationConfig': {
                'selectedTab': '短剧漫剧',
                'selectedSubtype': '对话剧情',
                'settings': {
                    'multiEpisode': False,
                    'targetVideoModelFamilySlug': TARGET_VIDEO_MODEL_FAMILY_SLUG,
                },
            },
        }),
    )
    if not response.ok:
        raise RuntimeError(f'create project failed: {response.status} {response.text()}')
    payload = response.json()
    project_id = payload['data']['projectId']

    detail = context.request.get(f'{api_base}/api/studio/projects/{project_id}', headers={'Accept': 'application/json'})
    if not detail.ok:
        raise RuntimeError(f'project detail failed: {detail.status} {detail.text()}')
    detail_payload = detail.json()
    episode_id = detail_payload['data']['currentEpisodeId'] or detail_payload['data']['episodes'][0]['id']
    return project_id, episode_id


def wait_for_generate_doc_response(page, web_base: str, project_id: str, trigger_click):
    with page.expect_response(
        lambda response: response.request.method == 'POST'
        and response.url == f'{web_base}/api/planner/projects/{project_id}/generate-doc',
        timeout=UI_TIMEOUT_MS,
    ) as response_info:
        trigger_click()
    response = response_info.value
    if not response.ok:
        raise RuntimeError(f'generate-doc failed: {response.status} {response.text()}')
    payload = response.json()
    return payload['data']['run']['id'], payload


def process_planner_run(run_id: str, env: dict[str, str]) -> dict:
    result = subprocess.run(
        ['pnpm', '--filter', '@aiv/api', 'process:planner-run', '--', run_id],
        cwd=REPO,
        text=True,
        capture_output=True,
        check=False,
        env=env,
    )
    (OUT_DIR / f'{run_id}-process.stdout.log').write_text(result.stdout, encoding='utf-8')
    (OUT_DIR / f'{run_id}-process.stderr.log').write_text(result.stderr, encoding='utf-8')
    if result.returncode != 0:
        raise RuntimeError(f'process run failed for {run_id}\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}')

    start = result.stdout.find('{')
    end = result.stdout.rfind('}')
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError(f'process run returned non-json output for {run_id}\nstdout:\n{result.stdout}')
    return json.loads(result.stdout[start:end + 1])


def fetch_planner_run(context, web_base: str, run_id: str) -> dict:
    response = context.request.get(f'{web_base}/api/planner/runs/{run_id}', headers={'Accept': 'application/json'})
    if not response.ok:
        raise RuntimeError(f'fetch planner run failed: {response.status} {response.text()}')
    return response.json()['data']


def fetch_planner_workspace(context, api_base: str, project_id: str, episode_id: str) -> dict:
    response = context.request.get(
        f'{api_base}/api/projects/{project_id}/planner/workspace?episodeId={episode_id}',
        headers={'Accept': 'application/json'},
    )
    if not response.ok:
        raise RuntimeError(f'planner workspace failed: {response.status} {response.text()}')
    return response.json()['data']


def generated_text_schema_summary(generated_text: str) -> dict[str, bool]:
    return {
        'hasNativeStructuredKeys': all(key in generated_text for key in ['"projectTitle"', '"summaryBullets"', '"acts"']),
        'hasLegacyStructuredKeys': any(key in generated_text for key in ['"故事梗概"', '"三幕主体剧情"', '"分镜剧本（适配模型）"']),
    }


def clip_text(text: str | None, max_length: int = 120) -> str | None:
    if text is None:
        return None
    normalized = text.strip()
    if len(normalized) <= max_length:
        return normalized
    return f'{normalized[: max(0, max_length - 1)].rstrip()}…'


def build_cli_summary(result: dict[str, object]) -> dict[str, object]:
    workspace = result.get('workspace') if isinstance(result.get('workspace'), dict) else {}
    active_refinement = workspace.get('activeRefinement') if isinstance(workspace, dict) else {}
    structured_doc = active_refinement.get('structuredDoc') if isinstance(active_refinement, dict) else {}
    summary_bullets = structured_doc.get('summaryBullets') if isinstance(structured_doc, dict) else []
    subjects = structured_doc.get('subjects') if isinstance(structured_doc, dict) else []

    first_summary = summary_bullets[0] if isinstance(summary_bullets, list) and summary_bullets else None
    subject_titles = [
        subject.get('title')
        for subject in (subjects[:3] if isinstance(subjects, list) else [])
        if isinstance(subject, dict) and isinstance(subject.get('title'), str)
    ]

    return {
        'projectId': result.get('projectId'),
        'episodeId': result.get('episodeId'),
        'outlineRunId': ((result.get('runs') or {}).get('outlineRunId') if isinstance(result.get('runs'), dict) else None),
        'refinementRunId': ((result.get('runs') or {}).get('refinementRunId') if isinstance(result.get('runs'), dict) else None),
        'actCount': result.get('actCount'),
        'shotCount': result.get('shotCount'),
        'subjectTitles': subject_titles,
        'summaryBullet': clip_text(first_summary if isinstance(first_summary, str) else None, 160),
        'generatedTextSchema': ((result.get('runs') or {}).get('refinementGeneratedTextSummary') if isinstance(result.get('runs'), dict) else None),
        'artifacts': {
            'result': str(OUT_DIR / 'result.json'),
            'outlineScreenshot': str(OUT_DIR / 'outline-live.png'),
            'refinementScreenshot': str(OUT_DIR / 'refinement-live.png'),
        },
    }


def existing_artifact_paths() -> dict[str, str]:
    candidates = {
        'result': OUT_DIR / 'result.json',
        'partialResult': PARTIAL_RESULT_PATH,
        'cliSummary': CLI_SUMMARY_PATH,
        'failureSummary': FAILURE_SUMMARY_PATH,
        'outlineScreenshot': OUT_DIR / 'outline-live.png',
        'refinementScreenshot': OUT_DIR / 'refinement-live.png',
        'apiLog': OUT_DIR / 'real-provider-api.log',
        'webLog': OUT_DIR / 'real-provider-web.log',
    }
    return {key: str(path) for key, path in candidates.items() if path.exists()}


def write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')


def build_failure_summary(result: dict[str, object], stage: str, error: Exception) -> dict[str, object]:
    runs = result.get('runs') if isinstance(result.get('runs'), dict) else {}
    return {
        'status': 'failed',
        'stage': stage,
        'error': str(error),
        'projectId': result.get('projectId'),
        'episodeId': result.get('episodeId'),
        'outlineRunId': runs.get('outlineRunId') if isinstance(runs, dict) else None,
        'refinementRunId': runs.get('refinementRunId') if isinstance(runs, dict) else None,
        'artifacts': existing_artifact_paths(),
    }


def main() -> None:
    api_port = int(os.environ.get('AIV_REAL_PROVIDER_API_PORT') or find_free_port())
    web_port = int(os.environ.get('AIV_REAL_PROVIDER_WEB_PORT') or find_free_port())
    api_base = f'http://127.0.0.1:{api_port}'
    web_base = f'http://127.0.0.1:{web_port}'
    shared_env = build_env()

    api_process = start_server(
        ['pnpm', 'dev:api'],
        api_port,
        'real-provider-api.log',
        env=build_env(API_PORT=str(api_port)),
    )
    web_process = start_server(
        ['pnpm', 'dev:web'],
        web_port,
        'real-provider-web.log',
        env=build_env(PORT=str(web_port), AIV_API_BASE_URL=api_base),
    )

    try:
        result: dict[str, object] = {
            'apiBase': api_base,
            'webBase': web_base,
            'auth': {'email': REAL_PROVIDER_EMAIL},
            'prompts': {
                'project': PROJECT_PROMPT,
                'refinement': REFINEMENT_PROMPT,
                'targetVideoModelFamilySlug': TARGET_VIDEO_MODEL_FAMILY_SLUG,
            },
            'logs': {
                'api': str(OUT_DIR / 'real-provider-api.log'),
                'web': str(OUT_DIR / 'real-provider-web.log'),
            },
            'screenshots': {},
            'runs': {},
        }
        current_stage = 'login'

        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                context = browser.new_context(base_url=web_base, viewport={'width': 1440, 'height': 1200})
                login = context.request.post(
                    f'{web_base}/api/auth/login',
                    headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
                    data=json.dumps({'email': REAL_PROVIDER_EMAIL, 'password': REAL_PROVIDER_PASSWORD}),
                )
                if not login.ok:
                    raise RuntimeError(f'login failed: {login.status} {login.text()}')

                current_stage = 'create_project'
                project_id, episode_id = create_project(context, api_base, web_base)
                result['projectId'] = project_id
                result['episodeId'] = episode_id

                current_stage = 'open_planner_page'
                page = context.new_page()
                page.goto(f'{web_base}/projects/{project_id}/planner?episodeId={episode_id}', wait_until='domcontentloaded')
                page.wait_for_timeout(1500)

                current_stage = 'generate_outline'
                textarea = page.locator('textarea').first
                textarea.wait_for(timeout=UI_TIMEOUT_MS)
                textarea.fill(PROJECT_PROMPT)
                submit_button = page.locator('form button[type="submit"]').first
                submit_button.wait_for(timeout=UI_TIMEOUT_MS)
                outline_run_id, outline_submit = wait_for_generate_doc_response(page, web_base, project_id, submit_button.click)
                result['runs']['outlineSubmit'] = outline_submit
                result['runs']['outlineRunId'] = outline_run_id
                result['runs']['outlineProcess'] = process_planner_run(outline_run_id, shared_env)

                current_stage = 'confirm_outline'
                page.reload(wait_until='domcontentloaded')
                page.wait_for_timeout(1500)
                page.get_by_text('本次执行：真实模型').first.wait_for(timeout=UI_TIMEOUT_MS)
                confirm_outline_button = page.get_by_role('button', name='确认大纲', exact=True)
                confirm_outline_button.wait_for(timeout=UI_TIMEOUT_MS)
                outline_shot = OUT_DIR / 'outline-live.png'
                page.screenshot(path=str(outline_shot), full_page=True)
                result['screenshots']['outline'] = str(outline_shot)

                confirm_outline_button.click()
                page.get_by_text('已确认当前大纲，下一步可开始细化剧情内容。').wait_for(timeout=UI_TIMEOUT_MS)
                page.reload(wait_until='domcontentloaded')
                page.wait_for_timeout(1500)

                current_stage = 'generate_refinement'
                textarea = page.locator('textarea').first
                textarea.wait_for(timeout=UI_TIMEOUT_MS)
                textarea.fill(REFINEMENT_PROMPT)
                submit_button = page.locator('form button[type="submit"]').first
                refinement_run_id, refinement_submit = wait_for_generate_doc_response(page, web_base, project_id, submit_button.click)
                result['runs']['refinementSubmit'] = refinement_submit
                result['runs']['refinementRunId'] = refinement_run_id
                result['runs']['refinementProcess'] = process_planner_run(refinement_run_id, shared_env)

                current_stage = 'validate_refinement_page'
                page.reload(wait_until='domcontentloaded')
                page.wait_for_timeout(1500)
                page.get_by_text('本次执行：真实模型').first.wait_for(timeout=UI_TIMEOUT_MS)
                page.get_by_role('heading', name='故事梗概').wait_for(timeout=UI_TIMEOUT_MS)
                page.get_by_role('heading', name='分镜剧本').wait_for(timeout=UI_TIMEOUT_MS)
                refinement_shot = OUT_DIR / 'refinement-live.png'
                page.screenshot(path=str(refinement_shot), full_page=True)
                result['screenshots']['refinement'] = str(refinement_shot)

                current_stage = 'fetch_run_results'
                outline_run = fetch_planner_run(context, web_base, outline_run_id)
                refinement_run = fetch_planner_run(context, web_base, refinement_run_id)
                workspace = fetch_planner_workspace(context, api_base, project_id, episode_id)
                structured_doc = ((workspace.get('activeRefinement') or {}).get('structuredDoc') or {})
                acts = structured_doc.get('acts') or []
                result['runs']['outlineRun'] = outline_run
                result['runs']['refinementRun'] = refinement_run
                result['runs']['refinementGeneratedTextSummary'] = generated_text_schema_summary(
                    ((refinement_run.get('output') or {}).get('generatedText') or '')
                )
                result['workspace'] = workspace
                result['actCount'] = len(acts)
                result['shotCount'] = sum(
                    len((act or {}).get('shots') or [])
                    for act in acts
                    if isinstance(act, dict)
                )

                browser.close()
        except Exception as error:
            if result.get('projectId') or result.get('runs'):
                write_json(PARTIAL_RESULT_PATH, result)
            failure_summary = build_failure_summary(result, current_stage, error)
            write_json(FAILURE_SUMMARY_PATH, failure_summary)
            print(json.dumps(failure_summary, ensure_ascii=False, indent=2), file=sys.stderr)
            raise

        result_path = OUT_DIR / 'result.json'
        result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        cli_summary = build_cli_summary(result)
        write_json(CLI_SUMMARY_PATH, cli_summary)
        print(json.dumps(cli_summary, ensure_ascii=False, indent=2))
    finally:
        stop_server(web_process)
        stop_server(api_process)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print('[smoke:browser-real-provider-planner] failed', file=sys.stderr)
        print(error, file=sys.stderr)
        sys.exit(1)
