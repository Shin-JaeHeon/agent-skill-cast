import { execa } from 'execa';
import { CliError } from './errors.js';

function normalizeMessage(err, command, args) {
    if (!err || typeof err !== 'object') {
        return `Command failed: ${command} ${args.join(' ')}`.trim();
    }

    return err.shortMessage || err.stderr || err.message || `Command failed: ${command}`;
}

export async function run(command, args = [], options = {}) {
    const {
        cwd = process.cwd(),
        stdio = 'pipe',
        reject = true,
        raw = false
    } = options;

    try {
        const result = await execa(command, args, { cwd, stdio, reject, stripFinalNewline: true });
        if (raw) return result;
        return (result.stdout || '').trim();
    } catch (err) {
        if (!reject) return null;
        throw new CliError('command_failed', normalizeMessage(err, command, args), 1);
    }
}

export async function runGit(args = [], options = {}) {
    return run('git', args, options);
}
