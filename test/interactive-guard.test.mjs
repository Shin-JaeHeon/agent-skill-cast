import assert from 'assert/strict';
import test from 'node:test';
import { createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('interactive entrypoints are blocked in CI JSON mode', async () => {
    const sandbox = await createSandbox();

    let result = await runCast(['config', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    let body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_subcommand');

    result = await runCast(['source', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_subcommand');
});
