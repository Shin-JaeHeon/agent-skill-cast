#!/usr/bin/env node

/**
 * 🧙‍♂️ Agent Skill Cast v1.1.0
 * "AI 에이전트 스킬을 시전(Cast)하세요."
 * Refactored Architecture
 */

const { initI18n, t } = require('./core/i18n');
const { loadConfig } = require('./core/config');
const { styles } = require('./core/utils');

// Command Handlers
const cmdInit = require('./commands/init');
const cmdSource = require('./commands/source');
const cmdUse = require('./commands/use');
const cmdList = require('./commands/list');
const cmdRemove = require('./commands/remove');
const cmdConfig = require('./commands/config');

async function main() {
    const config = loadConfig();
    initI18n(config.lang);

    const args = process.argv.slice(2);
    const command = args[0];
    const subCommand = args[1];
    const param = args[2] || args[1]; // legacy or new structure support logic might be needed inside commands

    // Dispatcher
    switch (command) {
        case 'init':
            await cmdInit.execute();
            break;

        case 'source':
            // Pass subCommand and remaining args to source handler
            // source add <url> -> subCommand=add, args=[url]
            // source list -> subCommand=list
            const sourceArgs = args.slice(2);
            await cmdSource.execute(subCommand, sourceArgs, config);
            break;

        case 'use':
            // cast use <query> or cast use --claude
            // args: [use, <query>] or [use, --flag]
            // Let's parse flags delicately if needed, but existing logic was simple.
            // Pass slice(1) to handler? handler expects `args` array and `config` and `options`
            // Current CLI parser usage in original index.js was:
            // main() { ... switch(command) ... case 'use': manager.use(args[1], options) }

            // Reconstruct logic:
            // We need to parse flags like --claude, --gemini
            const useQuery = args[1]?.startsWith('-') ? null : args[1];
            const useOptions = {
                claude: args.includes('--claude'),
                gemini: args.includes('--gemini'),
                codex: args.includes('--codex')
            };
            // If args[1] was a flag, then query might be null, which triggers interactive mode in handler

            // Wait, what if `cast use source/skill --claude`?
            // args[1] = source/skill, args[2] = --claude

            await cmdUse.execute([useQuery], config, useOptions);
            break;

        case 'sync':
            // Shortcut for `source sync`? Or a separate sync command?
            // Original: manager.sync()
            // Let's redirect to source sync
            await cmdSource.execute('sync', [], config);
            break;

        case 'list':
        case 'ls':
            // Original: manager.list() - this listed project skills
            await cmdList.execute();
            break;

        case 'remove':
        case 'rm':
            // Original: manager.remove(args[1])
            await cmdRemove.execute(args.slice(1));
            break;

        case 'config':
            // cast config lang ko
            await cmdConfig.execute(args.slice(1), config);
            break;

        default:
            console.log(`
${styles.bright}🧙‍♂️ Agent Skill Cast${styles.reset}
${t('usage_header')}
  cast init
  cast source add <url|path>
  cast use [source/skill]
  cast sync
  cast list
  cast remove [skill]
  cast config lang <en|ko>
`);
            break;
    }
}

main().catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
