import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import test from 'node:test';
import { mkdir, writeFile } from 'fs/promises';
import { createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('source add normalizes .claude/.gemini/.codex paths to app folder', async () => {
    const sandbox = await createSandbox();

    const appDir = path.join(sandbox.rootDir, 'mobile-app');
    const skillName = 'hello-skill';

    const agents = ['claude', 'gemini', 'codex'];
    for (const agent of agents) {
        const skillDir = path.join(appDir, `.${agent}`, 'skills', skillName);
        await mkdir(skillDir, { recursive: true });
        await writeFile(path.join(skillDir, 'SKILL.md'), `# ${skillName}\n`, 'utf-8');

        let result = await runCast(['source', 'add', path.join(appDir, `.${agent}`), '--ci', '--json'], sandbox);
        assert.equal(result.exitCode, 0);
        let body = parseJsonStdout(result.stdout);
        assert.equal(body.ok, true);
        assert.equal(body.data.type, 'local');
        assert.equal(body.data.name, 'mobile-app');

        result = await runCast(['source', 'add', path.join(appDir, `.${agent}`, 'skills'), '--ci', '--json'], sandbox);
        assert.equal(result.exitCode, 0);
        body = parseJsonStdout(result.stdout);
        assert.equal(body.ok, true);
        assert.equal(body.data.type, 'local');
        assert.equal(body.data.name, 'mobile-app');
    }

    const listResult = await runCast(['source', 'list', '--ci', '--json'], sandbox);
    assert.equal(listResult.exitCode, 0);
    const listBody = parseJsonStdout(listResult.stdout);
    assert.equal(listBody.ok, true);
    assert.equal(Array.isArray(listBody.data.sources), true);
    assert.equal(listBody.data.sources.length, 1);
    assert.equal(listBody.data.sources[0].name, 'mobile-app');
    assert.equal(listBody.data.sources[0].path, fs.realpathSync(appDir));
});

