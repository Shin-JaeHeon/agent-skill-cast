import assert from 'assert/strict';
import test from 'node:test';
import { createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('unknown command returns argument error in JSON mode', async () => {
    const sandbox = await createSandbox();
    const result = await runCast(['unknown-command', '--ci', '--json'], sandbox);

    assert.equal(result.exitCode, 2);
    const body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'argument_error');
});

test('source command without subcommand fails in CI JSON mode', async () => {
    const sandbox = await createSandbox();
    const result = await runCast(['source', '--ci', '--json'], sandbox);

    assert.equal(result.exitCode, 2);
    const body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_subcommand');
});

test('use --all without source fails with argument error', async () => {
    const sandbox = await createSandbox();
    const result = await runCast(['use', '--all', '--ci', '--json'], sandbox);

    assert.equal(result.exitCode, 2);
    const body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_argument');
});
