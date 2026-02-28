import os from 'os';
import path from 'path';
import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import { spawnSync } from 'child_process';

function runOrThrow(command, args, cwd) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf-8'
    });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
    }
}

export async function createSandbox() {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'asc-test-'));
    const homeDir = path.join(rootDir, 'home');
    const projectDir = path.join(rootDir, 'project');
    await mkdir(homeDir, { recursive: true });
    await mkdir(projectDir, { recursive: true });
    return { rootDir, homeDir, projectDir };
}

export async function createAgentDirs(projectDir, agents = ['claude', 'gemini', 'codex']) {
    for (const agent of agents) {
        await mkdir(path.join(projectDir, `.${agent}`), { recursive: true });
    }
}

export async function createLocalSource(rootDir, sourceName, skills = ['sample-skill']) {
    const sourceDir = path.join(rootDir, sourceName);
    await mkdir(sourceDir, { recursive: true });

    for (const skill of skills) {
        const skillDir = path.join(sourceDir, skill);
        await mkdir(skillDir, { recursive: true });
        await writeFile(path.join(skillDir, 'SKILL.md'), `# ${skill}\n`, 'utf-8');
    }

    return sourceDir;
}

export async function createGitSource(rootDir, baseName, skills = ['git-skill']) {
    const workDir = path.join(rootDir, `${baseName}-work`);
    await mkdir(workDir, { recursive: true });
    runOrThrow('git', ['init'], workDir);
    runOrThrow('git', ['config', 'user.name', 'ASC Test'], workDir);
    runOrThrow('git', ['config', 'user.email', 'asc@test.local'], workDir);

    for (const skill of skills) {
        const skillDir = path.join(workDir, skill);
        await mkdir(skillDir, { recursive: true });
        await writeFile(path.join(skillDir, 'SKILL.md'), `# ${skill}\n`, 'utf-8');
    }

    runOrThrow('git', ['add', '.'], workDir);
    runOrThrow('git', ['commit', '-m', 'initial'], workDir);

    const bareDir = path.join(rootDir, `${baseName}.git`);
    runOrThrow('git', ['clone', '--bare', workDir, bareDir], rootDir);
    return bareDir;
}
