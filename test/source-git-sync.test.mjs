import assert from 'assert/strict';
import test from 'node:test';
import { createAgentDirs, createGitSource, createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('git source can be added and synced in CI JSON mode', async () => {
    const sandbox = await createSandbox();
    await createAgentDirs(sandbox.projectDir);

    const gitSource = await createGitSource(sandbox.rootDir, 'team-skills', ['git-skill']);

    let result = await runCast(['source', 'add', gitSource, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    let body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.type, 'git');

    result = await runCast(['source', 'sync', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data.sources));
    assert.ok(body.data.sources.some(s => s.status === 'updated' || s.status === 'local'));
});
