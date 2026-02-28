export class CliError extends Error {
    constructor(error, message, exitCode = 1) {
        super(message);
        this.name = 'CliError';
        this.error = error;
        this.exitCode = exitCode;
    }
}

export function toCliError(err, fallback = 'Unknown error') {
    if (err instanceof CliError) {
        return err;
    }

    if (err && typeof err === 'object') {
        if ('error' in err && 'message' in err && 'exitCode' in err) {
            return new CliError(err.error, err.message, err.exitCode);
        }
    }

    const message = err instanceof Error ? err.message : fallback;
    return new CliError('execution_error', message, 1);
}
