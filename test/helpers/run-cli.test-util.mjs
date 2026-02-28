import path from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliEntry = path.resolve(__dirname, '../../src/index.js');

export async function runCast(args, options = {}) {
    const {
        cwd = options.projectDir,
        homeDir,
        input,
        env = {}
    } = options;

    const mergedEnv = {
        ...process.env,
        ASC_LANG: 'en',
        FORCE_COLOR: '0',
        ...env
    };
    if (homeDir) {
        mergedEnv.ASC_HOME = homeDir;
    }

    const result = await execa(process.execPath, [cliEntry, ...args], {
        cwd,
        input,
        reject: false,
        env: mergedEnv
    });

    return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
    };
}

export function parseJsonStdout(stdout) {
    return JSON.parse(stdout || '{}');
}
