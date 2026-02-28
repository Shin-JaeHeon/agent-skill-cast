import assert from 'assert/strict';
import test from 'node:test';
import { createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('source add returns path_not_found for invalid local path', async () => {
    const sandbox = await createSandbox();

    const result = await runCast(['source', 'add', '/definitely/not/found/path', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 1);
    const body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'path_not_found');
});

test('source remove validates required argument and unknown name', async () => {
    const sandbox = await createSandbox();

    let result = await runCast(['source', 'remove', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    let body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_argument');

    result = await runCast(['source', 'remove', 'missing-source', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 1);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'source_not_found');
});
