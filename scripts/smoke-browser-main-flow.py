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
PASSWORD = 'password123'
OUT_DIR = Path('/tmp/aiv-browser-regression')
OUT_DIR.mkdir(parents=True, exist_ok=True)
UI_TIMEOUT_MS = 45000


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
            raise RuntimeError(f'Process exited before port {port} became ready. See logs for details.')
        time.sleep(0.5)
    raise RuntimeError(f'Port {port} did not open within {timeout} seconds')


def start_server(cmd: list[str], port: int, log_name: str, env: dict[str, str] | None = None):
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


def stop_server(process):
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


def run(cmd: list[str], env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=REPO, check=True, text=True, capture_output=True, env=env)


def build_env(**overrides: str) -> dict[str, str]:
    env = os.environ.copy()
    env.update(overrides)
    return env


def disable_smoke_text_provider_config(email: str) -> None:
    run([
        'node',
        '-e',
        "const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');"
        "const prisma = new PrismaClient();"
        "(async()=>{"
        "const email = process.env.SMOKE_EMAIL;"
        "const user = await prisma.user.findUnique({ where: { email } });"
        "if (!user) throw new Error(`Smoke user not found: ${email}`);"
        "const provider = await prisma.modelProvider.findUnique({ where: { code: 'smoke-text-provider' } });"
        "if (!provider) throw new Error('Smoke text provider not found');"
        "await prisma.userProviderConfig.upsert({"
        "where: { userId_providerId: { userId: user.id, providerId: provider.id } },"
        "update: { enabled: false, apiKey: null, baseUrlOverride: null, optionsJson: null },"
        "create: { userId: user.id, providerId: provider.id, enabled: false, apiKey: null, baseUrlOverride: null, optionsJson: null }"
        "});"
        "await prisma.$disconnect();"
        "})().catch(async (error)=>{ console.error(error); process.exit(1); });",
    ], env=build_env(SMOKE_EMAIL=email))


def main():
    api_port = int(os.environ.get('AIV_SMOKE_API_PORT') or find_free_port())
    web_port = int(os.environ.get('AIV_SMOKE_WEB_PORT') or find_free_port())
    api_base = f'http://127.0.0.1:{api_port}'
    web_base = f'http://127.0.0.1:{web_port}'
    api_process = start_server(
        ['pnpm', 'dev:api'],
        api_port,
        'api-server.log',
        env=build_env(API_PORT=str(api_port)),
    )
    web_process = start_server(
        ['pnpm', 'dev:web'],
        web_port,
        'web-server.log',
        env=build_env(PORT=str(web_port), AIV_API_BASE_URL=api_base),
    )
    try:
        run(['pnpm', '--filter', '@aiv/api', 'smoke:planner-api-refactor'], env=build_env(API_BASE_URL=api_base))

        query = run([
            'node',
            '-e',
            "const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');"
            "const prisma = new PrismaClient();"
            "(async()=>{"
            "const user = await prisma.user.findFirst({ where: { email: { startsWith: 'planner-refactor-' } }, orderBy: { createdAt: 'desc' } });"
            "if (!user) throw new Error('No planner refactor smoke user found');"
            "const project = await prisma.project.findFirst({ where: { createdById: user.id }, orderBy: { createdAt: 'desc' } });"
            "if (!project) throw new Error('No planner refactor smoke project found');"
            "const episode = await prisma.episode.findFirst({ where: { projectId: project.id }, orderBy: { episodeNo: 'asc' } });"
            "if (!episode) throw new Error('No planner refactor smoke episode found');"
            "console.log(JSON.stringify({ email: user.email, projectId: project.id, episodeId: episode.id, title: project.title }));"
            "await prisma.$disconnect();"
            "})().catch(async (error)=>{ console.error(error); process.exit(1); });",
        ])
        info = json.loads(query.stdout.strip())

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(base_url=web_base, viewport={'width': 1440, 'height': 1024})
            login_response = context.request.post(
                f'{web_base}/api/auth/login',
                headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
                data=json.dumps({'email': info['email'], 'password': PASSWORD}),
            )
            if not login_response.ok:
                raise RuntimeError(f'Login failed: {login_response.status} {login_response.text()}')

            page = context.new_page()

            planner_url = f'{web_base}/projects/{info["projectId"]}/planner?episodeId={info["episodeId"]}'
            planner_workspace_response = context.request.get(
                f'{web_base}/api/planner/projects/{info["projectId"]}/workspace?episodeId={info["episodeId"]}',
                headers={'Accept': 'application/json'},
            )
            if not planner_workspace_response.ok:
                raise RuntimeError(f'Planner workspace request failed: {planner_workspace_response.status} {planner_workspace_response.text()}')
            planner_workspace_payload = planner_workspace_response.json()
            planner_workspace = planner_workspace_payload.get('data') if isinstance(planner_workspace_payload, dict) else None
            active_refinement = planner_workspace.get('activeRefinement') if isinstance(planner_workspace, dict) else None
            debug_apply_source = active_refinement.get('debugApplySource') if isinstance(active_refinement, dict) else None
            debug_run_id = debug_apply_source.get('debugRunId') if isinstance(debug_apply_source, dict) else None
            if not debug_run_id and isinstance(planner_workspace, dict):
                refinement_versions = planner_workspace.get('refinementVersions')
                if isinstance(refinement_versions, list):
                    debug_apply_version = next((
                        version for version in refinement_versions
                        if isinstance(version, dict)
                        and version.get('triggerType') == 'debug_apply'
                        and isinstance(version.get('debugApplySource'), dict)
                        and version['debugApplySource'].get('debugRunId')
                    ), None)
                    if debug_apply_version:
                        activate_response = context.request.post(
                            f'{web_base}/api/planner/projects/{info["projectId"]}/refinement-versions/{debug_apply_version["id"]}/activate',
                            headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
                            data=json.dumps({'episodeId': info['episodeId']}),
                        )
                        if not activate_response.ok:
                            raise RuntimeError(
                                f'Activating debug apply refinement failed: {activate_response.status} {activate_response.text()}'
                            )
                        planner_workspace_response = context.request.get(
                            f'{web_base}/api/planner/projects/{info["projectId"]}/workspace?episodeId={info["episodeId"]}',
                            headers={'Accept': 'application/json'},
                        )
                        if not planner_workspace_response.ok:
                            raise RuntimeError(
                                f'Planner workspace request after activation failed: {planner_workspace_response.status} {planner_workspace_response.text()}'
                            )
                        planner_workspace_payload = planner_workspace_response.json()
                        planner_workspace = planner_workspace_payload.get('data') if isinstance(planner_workspace_payload, dict) else None
                        active_refinement = planner_workspace.get('activeRefinement') if isinstance(planner_workspace, dict) else None
                        debug_apply_source = active_refinement.get('debugApplySource') if isinstance(active_refinement, dict) else None
                        debug_run_id = debug_apply_source.get('debugRunId') if isinstance(debug_apply_source, dict) else None
            if not debug_run_id:
                raise RuntimeError('Planner workspace did not return debugApplySource.debugRunId for the active refinement.')

            page.goto(planner_url, wait_until='domcontentloaded')
            planner_creation_button = page.get_by_role('button', name='进入创作')
            planner_creation_button.wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_text('当前工作区版本来自 Planner Debug 调试应用').wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_text('当前版本来自调试应用').wait_for(timeout=UI_TIMEOUT_MS)
            view_debug_buttons = page.get_by_role('button', name='查看调试 Run')
            if view_debug_buttons.count() < 1:
                raise RuntimeError('Planner page did not render a 查看调试 Run button for debug-applied refinements.')
            view_debug_buttons.first.click()
            page.wait_for_url(f'**/admin/planner-debug/runs/{debug_run_id}*', timeout=UI_TIMEOUT_MS)
            page.get_by_role('heading', name='策划 Agent 调试回放').wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_text(debug_run_id).first.wait_for(timeout=UI_TIMEOUT_MS)
            current_url = page.url
            if f'projectId={info["projectId"]}' not in current_url or f'episodeId={info["episodeId"]}' not in current_url:
                raise RuntimeError(f'Planner debug run navigation lost planner workspace context: {current_url}')
            page.get_by_role('link', name='返回策划工作区').first.click()
            page.wait_for_url(f'**/projects/{info["projectId"]}/planner?episodeId={info["episodeId"]}', timeout=UI_TIMEOUT_MS)
            page.get_by_role('button', name='历史版本').click()
            page.get_by_role('menu', name='历史版本').wait_for(timeout=UI_TIMEOUT_MS)
            history_source_button = page.locator('button[title="查看来源调试 Run"]').first
            history_source_button.wait_for(timeout=UI_TIMEOUT_MS)
            history_source_button.click()
            page.wait_for_url(f'**/admin/planner-debug/runs/{debug_run_id}*', timeout=UI_TIMEOUT_MS)
            page.get_by_role('link', name='返回策划工作区').first.click()
            page.wait_for_url(f'**/projects/{info["projectId"]}/planner?episodeId={info["episodeId"]}', timeout=UI_TIMEOUT_MS)
            page.get_by_role('region', name='分镜提示词预览').wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_text('生成提示词预览').wait_for(timeout=UI_TIMEOUT_MS)
            page.screenshot(path=str(OUT_DIR / 'planner.png'), full_page=True)

            planner_creation_button.click()
            page.wait_for_url(f'**/projects/{info["projectId"]}/creation', timeout=UI_TIMEOUT_MS)

            creation_workspace_response = context.request.get(
                f'{web_base}/api/creation/projects/{info["projectId"]}/workspace?episodeId={info["episodeId"]}',
                headers={'Accept': 'application/json'},
            )
            if not creation_workspace_response.ok:
                raise RuntimeError(f'Creation workspace request failed: {creation_workspace_response.status} {creation_workspace_response.text()}')
            creation_workspace_payload = creation_workspace_response.json()
            creation_workspace = creation_workspace_payload.get('data') if isinstance(creation_workspace_payload, dict) else None
            if not creation_workspace or not creation_workspace.get('shots'):
                raise RuntimeError('Creation workspace did not return any shots.')
            first_creation_shot = creation_workspace['shots'][0]
            if not first_creation_shot.get('promptJson'):
                raise RuntimeError('Creation workspace missing finalized promptJson on first shot.')
            if not first_creation_shot.get('targetVideoModelFamilySlug'):
                raise RuntimeError('Creation workspace missing targetVideoModelFamilySlug on first shot.')
            creation_stage_nav = page.get_by_role('navigation', name='项目阶段')
            creation_stage_nav.get_by_role('link', name='分片生成').wait_for(timeout=UI_TIMEOUT_MS)
            if creation_stage_nav.get_by_role('link', name='分片生成').get_attribute('aria-current') != 'page':
                raise RuntimeError('Creation page stage navigation did not mark 分片生成 as active.')
            creation_stage_nav.get_by_role('link', name='发布').wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_role('button', name='一键转视频').wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_text(first_creation_shot['title']).first.wait_for(timeout=UI_TIMEOUT_MS)
            page.screenshot(path=str(OUT_DIR / 'creation.png'), full_page=True)

            creation_stage_nav.get_by_role('link', name='发布').click()
            page.wait_for_url(f'**/projects/{info["projectId"]}/publish', timeout=UI_TIMEOUT_MS)

            publish_workspace_response = context.request.get(
                f'{web_base}/api/publish/projects/{info["projectId"]}/workspace?episodeId={info["episodeId"]}',
                headers={'Accept': 'application/json'},
            )
            if not publish_workspace_response.ok:
                raise RuntimeError(f'Publish workspace request failed: {publish_workspace_response.status} {publish_workspace_response.text()}')
            publish_workspace_payload = publish_workspace_response.json()
            publish_workspace = publish_workspace_payload.get('data') if isinstance(publish_workspace_payload, dict) else None
            publish_summary = publish_workspace.get('summary') if isinstance(publish_workspace, dict) else None
            if not publish_summary:
                raise RuntimeError('Publish workspace missing summary.')
            if int(publish_summary.get('totalShots', 0)) <= 0:
                raise RuntimeError('Publish workspace reports zero shots.')
            publish_shots = publish_workspace.get('shots') if isinstance(publish_workspace, dict) else None
            if not isinstance(publish_shots, list) or len(publish_shots) == 0:
                raise RuntimeError('Publish workspace missing shot list.')
            if int(publish_summary.get('totalShots', 0)) != len(publish_shots):
                raise RuntimeError('Publish workspace summary totalShots does not match shot list length.')
            publish_stage_nav = page.get_by_role('navigation', name='项目阶段')
            publish_stage_nav.get_by_role('link', name='发布').wait_for(timeout=UI_TIMEOUT_MS)
            if publish_stage_nav.get_by_role('link', name='发布').get_attribute('aria-current') != 'page':
                raise RuntimeError('Publish page stage navigation did not mark 发布 as active.')
            page.get_by_role('button', name='发布作品').first.wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_role('button', name='从历史创作中选择').wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_role('button', name='从历史创作中选择').click()
            page.get_by_role('dialog', name='从历史创作中选择').wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_role('button', name='全部').wait_for(timeout=UI_TIMEOUT_MS)
            page.get_by_role('button', name='取消').click()
            page.get_by_text('发布作品').first.wait_for(timeout=UI_TIMEOUT_MS)
            page.screenshot(path=str(OUT_DIR / 'publish.png'), full_page=True)

            disable_smoke_text_provider_config(info['email'])
            page.goto(planner_url, wait_until='domcontentloaded')
            page.locator('textarea').first.fill('请继续改写故事节奏，验证 Provider 缺失时的前端引导。')
            planner_submit_button = page.locator('form button[type="submit"]').first
            planner_submit_button.wait_for(timeout=UI_TIMEOUT_MS)
            planner_submit_button.click()
            page.get_by_text('策划页 AI 主链路已关闭自动 mock 回退').wait_for(timeout=UI_TIMEOUT_MS)
            provider_cta = page.get_by_role('link', name='前往 Provider 配置')
            provider_cta.wait_for(timeout=UI_TIMEOUT_MS)
            page.screenshot(path=str(OUT_DIR / 'planner-provider-required.png'), full_page=True)
            provider_cta.click()
            page.wait_for_url(f'{web_base}/settings/providers', timeout=UI_TIMEOUT_MS)
            page.get_by_role('heading', name='把模型权限交给用户自己配置').wait_for(timeout=UI_TIMEOUT_MS)
            ark_card = page.locator('section').filter(has=page.get_by_role('heading', name='Volcengine Ark')).first
            ark_card.wait_for(timeout=UI_TIMEOUT_MS)
            ark_card.get_by_text('文本模型', exact=True).wait_for(timeout=UI_TIMEOUT_MS)
            ark_card.get_by_text('图片模型', exact=True).wait_for(timeout=UI_TIMEOUT_MS)
            ark_card.get_by_text('视频模型', exact=True).wait_for(timeout=UI_TIMEOUT_MS)
            ark_card.get_by_text('音频模型', exact=True).wait_for(timeout=UI_TIMEOUT_MS)
            page.screenshot(path=str(OUT_DIR / 'settings-providers.png'), full_page=True)

            browser.close()

        print(json.dumps({
            'project': info,
            'screenshots': {
                'planner': str(OUT_DIR / 'planner.png'),
                'creation': str(OUT_DIR / 'creation.png'),
                'publish': str(OUT_DIR / 'publish.png'),
                'plannerProviderRequired': str(OUT_DIR / 'planner-provider-required.png'),
                'settingsProviders': str(OUT_DIR / 'settings-providers.png'),
            },
            'logs': {
                'api': str(OUT_DIR / 'api-server.log'),
                'web': str(OUT_DIR / 'web-server.log'),
            },
            'ports': {
                'api': api_port,
                'web': web_port,
            },
        }, ensure_ascii=False, indent=2))
    finally:
        stop_server(web_process)
        stop_server(api_process)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print('[smoke:web-main-flow] failed', file=sys.stderr)
        print(error, file=sys.stderr)
        sys.exit(1)
