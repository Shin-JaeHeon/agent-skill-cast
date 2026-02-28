#!/usr/bin/env node

import { Command } from 'commander';
import { initI18n, t } from './core/i18n.js';
import { loadConfig } from './core/config.js';
import { deprecate } from './core/runtime.js';
import { ciError, getJSONMode, setCIMode, styles } from './core/utils.js';

import { execute as initCommand } from './commands/init.js';
import { execute as sourceCommand } from './commands/source.js';
import { execute as useCommand } from './commands/use.js';
import { execute as listCommand } from './commands/list.js';
import { execute as removeCommand } from './commands/remove.js';
import { execute as configCommand } from './commands/config.js';

const rawArgs = process.argv.slice(2);
const isJSONMode = rawArgs.includes('--json');
const isCIMode = rawArgs.includes('--ci') || isJSONMode || !process.stdin.isTTY;

setCIMode(isCIMode, isJSONMode);

function reloadConfigAndI18n() {
    const config = loadConfig();
    initI18n(config.lang);
    return config;
}

reloadConfigAndI18n();

function printUsage() {
    console.log(`
${styles.bright}🧙‍♂️ Agent Skill Cast${styles.reset}
${t('usage_header')}
  cast init
  cast source add <url|path>
  cast source list
  cast source remove <name>
  cast source sync
  cast use <source>/<skill> [--all] [--copy] [--claude|--gemini|--codex]
  cast list
  cast remove <skill>
  cast config lang <en|ko>
`);
}

function withHandledErrors(handler) {
    return async (...args) => {
        try {
            await handler(...args);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            ciError('execution_error', message);
            process.exit(1);
        }
    };
}

function addMetaOptions(command) {
    return command
        .option('--ci', 'non-interactive mode')
        .option('--json', 'machine-readable output');
}

function hasCommandArgument(args) {
    return args.some(arg => !arg.startsWith('-'));
}

function hasHelpFlag(args) {
    return args.includes('-h') || args.includes('--help');
}

function handleParseError(error) {
    if (error?.code === 'commander.helpDisplayed') {
        process.exit(0);
    }

    const argumentErrorCodes = new Set([
        'commander.unknownOption',
        'commander.missingArgument',
        'commander.optionMissingArgument',
        'commander.excessArguments',
        'commander.unknownCommand',
        'commander.invalidArgument'
    ]);

    const isArgumentError = argumentErrorCodes.has(error?.code);
    const exitCode = isArgumentError ? 2 : 1;
    const key = isArgumentError ? 'argument_error' : 'execution_error';
    const message = error?.message || 'Unknown error';

    ciError(key, message);
    process.exit(exitCode);
}

async function main() {
    const noCommand = !hasCommandArgument(rawArgs);
    if (noCommand && !hasHelpFlag(rawArgs)) {
        if (getJSONMode() || isCIMode) {
            ciError('missing_command', t('ci_error_requires_command'));
            process.exit(2);
        }
        if (rawArgs.length === 0) {
            printUsage();
            return;
        }
    }

    const program = new Command();
    program
        .name('cast')
        .description('Agent Skill Cast')
        .allowExcessArguments(false)
        .option('--ci', 'non-interactive mode')
        .option('--json', 'machine-readable output');
    if (!getJSONMode()) {
        program.showHelpAfterError();
    }

    addMetaOptions(program.command('init').description('Initialize ASC in current project'))
        .action(withHandledErrors(async () => {
            reloadConfigAndI18n();
            await initCommand();
        }));

    addMetaOptions(
        program.command('source [subCommand] [value]').description('Source management')
    ).action(withHandledErrors(async (subCommand, value) => {
        const config = reloadConfigAndI18n();
        const args = value === undefined ? [] : [value];
        await sourceCommand(subCommand, args, config);
    }));

    addMetaOptions(
        program
            .command('use [query]')
            .description('Install skills')
            .option('--claude', 'install only to .claude/skills')
            .option('--gemini', 'install only to .gemini/skills')
            .option('--codex', 'install only to .codex/skills')
            .option('--all', 'install all skills from source')
            .option('--copy', 'copy skill instead of symlink')
    ).action(withHandledErrors(async (query, options) => {
        const config = reloadConfigAndI18n();
        const useOptions = {
            claude: Boolean(options.claude),
            gemini: Boolean(options.gemini),
            codex: Boolean(options.codex),
            all: Boolean(options.all),
            copy: Boolean(options.copy)
        };
        await useCommand([query], config, useOptions);
    }));

    addMetaOptions(program.command('list').description('Show installed skills'))
        .action(withHandledErrors(async () => {
            reloadConfigAndI18n();
            await listCommand();
        }));

    addMetaOptions(program.command('remove [skill]').description('Remove installed skill'))
        .action(withHandledErrors(async (skill) => {
            reloadConfigAndI18n();
            await removeCommand([skill]);
        }));

    addMetaOptions(program.command('config [key] [value]').description('Configuration'))
        .action(withHandledErrors(async (key, value) => {
            const cfg = reloadConfigAndI18n();
            await configCommand([key, value], cfg);
        }));

    addMetaOptions(program.command('sync').description('Deprecated alias for `cast source sync`'))
        .action(withHandledErrors(async () => {
            deprecate("`cast sync` is deprecated. Use `cast source sync`.");
            const config = reloadConfigAndI18n();
            await sourceCommand('sync', [], config);
        }));

    addMetaOptions(program.command('ls').description('Deprecated alias for `cast list`'))
        .action(withHandledErrors(async () => {
            deprecate("`cast ls` is deprecated. Use `cast list`.");
            await listCommand();
        }));

    addMetaOptions(program.command('rm [skill]').description('Deprecated alias for `cast remove`'))
        .action(withHandledErrors(async (skill) => {
            deprecate("`cast rm` is deprecated. Use `cast remove`.");
            await removeCommand([skill]);
        }));

    program.exitOverride();

    try {
        await program.parseAsync(process.argv);
    } catch (error) {
        handleParseError(error);
    }
}

main().catch(err => {
    const message = err instanceof Error ? err.message : String(err);
    ciError('execution_error', message);
    process.exit(1);
});
