import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import test from 'node:test';
import { createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('init in JSON mode creates config only once', async () => {
    const sandbox = await createSandbox();
    const configPath = path.join(sandbox.homeDir, '.asc-config.json');

    let result = await runCast(['init', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    let body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.created, true);
    assert.equal(fs.existsSync(configPath), true);

    result = await runCast(['init', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.created, false);
});

test('config lang persists valid value and rejects invalid value', async () => {
    const sandbox = await createSandbox();
    const configPath = path.join(sandbox.homeDir, '.asc-config.json');

    let result = await runCast(['config', 'lang', 'ko', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    let body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.key, 'lang');
    assert.equal(body.data.value, 'ko');

    const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.equal(saved.lang, 'ko');

    result = await runCast(['config', 'lang', 'jp', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'invalid_argument');
});
