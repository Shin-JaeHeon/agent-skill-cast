import assert from 'assert/strict';
import path from 'path';
import test from 'node:test';
import { createAgentDirs, createLocalSource, createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { runCast } from './helpers/run-cli.test-util.mjs';

test('legacy aliases still work with deprecation warning', async () => {
    const sandbox = await createSandbox();
    await createAgentDirs(sandbox.projectDir);

    const sourceDir = await createLocalSource(sandbox.rootDir, 'legacy-skills', ['legacy-skill']);
    const sourceName = path.basename(sourceDir);

    let result = await runCast(['source', 'add', sourceDir, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);

    result = await runCast(['use', `${sourceName}/legacy-skill`, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);

    result = await runCast(['ls', '--ci'], sandbox);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.toLowerCase().includes('deprecated'), true);

    result = await runCast(['sync', '--ci'], sandbox);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.toLowerCase().includes('deprecated'), true);
});
