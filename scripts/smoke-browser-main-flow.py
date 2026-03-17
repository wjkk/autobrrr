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
WEB_BASE = 'http://127.0.0.1:3000'
PASSWORD = 'password123'
OUT_DIR = Path('/tmp/aiv-browser-regression')
OUT_DIR.mkdir(parents=True, exist_ok=True)
UI_TIMEOUT_MS = 45000


def port_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(('127.0.0.1', port)) == 0


def wait_for_port(port: int, timeout: float = 60.0) -> None:
    started = time.time()
    while time.time() - started < timeout:
        if port_open(port):
            return
        time.sleep(0.5)
    raise RuntimeError(f'Port {port} did not open within {timeout} seconds')


def start_server(cmd: list[str], port: int):
    if port_open(port):
        return None

    process = subprocess.Popen(
        cmd,
        cwd=REPO,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        preexec_fn=os.setsid,
    )
    wait_for_port(port)
    return process


def stop_server(process):
    if process is None:
        return
    try:
        os.killpg(os.getpgid(process.pid), signal.SIGTERM)
    except ProcessLookupError:
        return
    process.wait(timeout=10)


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=REPO, check=True, text=True, capture_output=True)


def main():
    api_process = start_server(['pnpm', 'dev:api'], 8787)
    web_process = start_server(['pnpm', 'dev:web'], 3000)
    try:
        run(['pnpm', '--filter', '@aiv/api', 'smoke:planner-api-refactor'])

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
            context = browser.new_context(base_url=WEB_BASE, viewport={'width': 1440, 'height': 1024})
            login_response = context.request.post(
                f'{WEB_BASE}/api/auth/login',
                headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
                data=json.dumps({'email': info['email'], 'password': PASSWORD}),
            )
            if not login_response.ok:
                raise RuntimeError(f'Login failed: {login_response.status} {login_response.text()}')

            page = context.new_page()

            planner_url = f'{WEB_BASE}/projects/{info["projectId"]}/planner'
            page.goto(planner_url, wait_until='domcontentloaded')
            planner_creation_button = page.get_by_role('button', name='进入创作')
            planner_creation_button.wait_for(timeout=UI_TIMEOUT_MS)
            page.screenshot(path=str(OUT_DIR / 'planner.png'), full_page=True)

            planner_creation_button.click()
            page.wait_for_url(f'**/projects/{info["projectId"]}/creation', timeout=UI_TIMEOUT_MS)

            creation_workspace_response = context.request.get(
                f'{WEB_BASE}/api/creation/projects/{info["projectId"]}/workspace?episodeId={info["episodeId"]}',
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
                f'{WEB_BASE}/api/publish/projects/{info["projectId"]}/workspace?episodeId={info["episodeId"]}',
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
            page.get_by_text('发布作品').first.wait_for(timeout=UI_TIMEOUT_MS)
            page.screenshot(path=str(OUT_DIR / 'publish.png'), full_page=True)

            browser.close()

        print(json.dumps({
            'project': info,
            'screenshots': {
                'planner': str(OUT_DIR / 'planner.png'),
                'creation': str(OUT_DIR / 'creation.png'),
                'publish': str(OUT_DIR / 'publish.png'),
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
