import assert from 'assert/strict';
import test from 'node:test';
import { createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('JSON mode always returns envelope for argument and routing errors', async () => {
    const sandbox = await createSandbox();

    let result = await runCast(['--json'], sandbox);
    assert.equal(result.exitCode, 2);
    let body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_command');

    result = await runCast(['source', 'unknown', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'invalid_subcommand');

    result = await runCast(['source', 'add', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_argument');

    result = await runCast(['config', 'foo', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'invalid_argument');

    result = await runCast(['config', 'lang', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_argument');

    result = await runCast(['use', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_argument');
});
