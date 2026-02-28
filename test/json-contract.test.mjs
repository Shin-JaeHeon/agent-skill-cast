import assert from 'assert/strict';
import path from 'path';
import test from 'node:test';
import { createAgentDirs, createLocalSource, createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('JSON mode returns consistent envelope across core commands', async () => {
    const sandbox = await createSandbox();
    await createAgentDirs(sandbox.projectDir);

    const sourceDir = await createLocalSource(sandbox.rootDir, 'local-skills', ['hello-skill']);
    const sourceName = path.basename(sourceDir);

    let result = await runCast(['source', 'add', sourceDir, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    let body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.type, 'local');

    result = await runCast(['source', 'list', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.ok(body.data.sources.some(s => s.name === sourceName));

    result = await runCast(['use', `${sourceName}/hello-skill`, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.ok(typeof body.data.installed === 'number');

    result = await runCast(['list', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.data.skills));

    result = await runCast(['remove', `${sourceName}/hello-skill`, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.removed >= 0, true);

    result = await runCast(['remove', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_argument');
});
