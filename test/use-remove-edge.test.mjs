import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import test from 'node:test';
import { mkdir, writeFile } from 'fs/promises';
import { createAgentDirs, createLocalSource, createSandbox } from './helpers/fs-fixture.test-util.mjs';
import { parseJsonStdout, runCast } from './helpers/run-cli.test-util.mjs';

test('use requires source/skill query in CI JSON mode when --all is not set', async () => {
    const sandbox = await createSandbox();
    await createAgentDirs(sandbox.projectDir);

    const sourceDir = await createLocalSource(sandbox.rootDir, 'catalog', ['alpha']);
    const sourceName = path.basename(sourceDir);

    let result = await runCast(['source', 'add', sourceDir, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);

    result = await runCast(['use', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 2);
    const body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'missing_argument');
});

test('use returns skill_not_found when source exists but skill key is missing', async () => {
    const sandbox = await createSandbox();
    await createAgentDirs(sandbox.projectDir);

    const sourceDir = await createLocalSource(sandbox.rootDir, 'catalog', ['alpha']);
    const sourceName = path.basename(sourceDir);

    let result = await runCast(['source', 'add', sourceDir, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);

    result = await runCast(['use', `${sourceName}/missing-skill`, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 1);
    const body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'skill_not_found');
});

test('remove blocks deleting local directories that are not managed symlinks', async () => {
    const sandbox = await createSandbox();
    await createAgentDirs(sandbox.projectDir, ['claude']);

    const localSkillDir = path.join(sandbox.projectDir, '.claude', 'skills', 'manual-only');
    await mkdir(localSkillDir, { recursive: true });
    await writeFile(path.join(localSkillDir, 'SKILL.md'), '# manual-only\n', 'utf-8');

    const result = await runCast(['remove', 'manual-only', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 1);
    const body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.error, 'cannot_remove_local');
});

test('remove by skill name deletes installed skill from all agents', async () => {
    const sandbox = await createSandbox();
    await createAgentDirs(sandbox.projectDir);

    const sourceDir = await createLocalSource(sandbox.rootDir, 'bulk-remove', ['alpha']);
    const sourceName = path.basename(sourceDir);

    let result = await runCast(['source', 'add', sourceDir, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);

    result = await runCast(['use', `${sourceName}/alpha`, '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    let body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.installed, 3);

    result = await runCast(['remove', 'alpha', '--ci', '--json'], sandbox);
    assert.equal(result.exitCode, 0);
    body = parseJsonStdout(result.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.data.removed, 3);

    const claudeSkill = path.join(sandbox.projectDir, '.claude', 'skills', 'alpha');
    const geminiSkill = path.join(sandbox.projectDir, '.gemini', 'skills', 'alpha');
    const codexSkill = path.join(sandbox.projectDir, '.codex', 'skills', 'alpha');
    assert.equal(fs.existsSync(claudeSkill), false);
    assert.equal(fs.existsSync(geminiSkill), false);
    assert.equal(fs.existsSync(codexSkill), false);
});
