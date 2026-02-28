import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import test from 'node:test';
import { createAgentDirs, createLocalSource, createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('use --all --copy --claude installs all skills only into .claude', async () => {
    const sandbox = await createSandbox();
    await createAgentDirs(sandbox.projectDir);

    const sourceDir = await createLocalSource(sandbox.rootDir, 'all-skills', ['alpha', 'beta']);
    const sourceName = path.basename(sourceDir);

    let result = await runCast(['source', 'add', sourceDir, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);

    result = await runCast(['use', sourceName, '--all', '--copy', '--claude', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    const body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.sourceName, sourceName);
    assert.equal(body.data.installed, 2);

    const claudeAlpha = path.join(sandbox.projectDir, '.claude', 'skills', 'alpha');
    const claudeBeta = path.join(sandbox.projectDir, '.claude', 'skills', 'beta');
    const geminiAlpha = path.join(sandbox.projectDir, '.gemini', 'skills', 'alpha');

    assert.equal(fs.existsSync(claudeAlpha), true);
    assert.equal(fs.existsSync(claudeBeta), true);
    assert.equal(fs.existsSync(geminiAlpha), false);
});
