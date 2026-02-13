const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { log, styles, runCmd, ensureDir, resolveHome } = require('./utils');
const { SOURCES_DIR, saveConfig } = require('./config');
const { t } = require('./i18n');

// _clone implementation (moved from CastManager)
async function cloneSource(externalUrl, config) {
    const repoName = path.basename(externalUrl, '.git') || 'external-skills';
    const destDir = path.join(SOURCES_DIR, repoName);

    if (fs.existsSync(destDir)) {
        log(t('warn_source_exists', { repoName }), styles.yellow);
        try {
            runCmd('git pull', destDir);
            log(t('success_source_updated', { repoName }), styles.green);
        } catch (e) {
            runCmd('git pull', destDir, true);
        }
    } else {
        log(t('info_cloning', { repoName }), styles.cyan);
        try {
            ensureDir(SOURCES_DIR);
            execSync(`git clone ${externalUrl} "${destDir}"`, { stdio: 'inherit' });
            log(t('success_source_added', { repoName }), styles.green);
        } catch (e) {
            log(t('error_clone_fail'), styles.red);
            return;
        }
    }

    config.sources[repoName] = { type: 'git', url: externalUrl };
    saveConfig(config);
    log(t('info_use_hint', { repoName }), styles.yellow);
}

// _import implementation (moved from CastManager)
async function importSource(localPath, config) {
    const resolvedPath = fs.realpathSync(resolveHome(localPath));

    if (!fs.existsSync(resolvedPath)) {
        return log(t('error_path_not_found', { path: resolvedPath }), styles.red);
    }

    const sourceName = path.basename(resolvedPath);
    const linkPath = path.join(SOURCES_DIR, sourceName);

    ensureDir(SOURCES_DIR);

    if (fs.existsSync(linkPath)) {
        fs.rmSync(linkPath, { recursive: true, force: true });
    }

    try {
        const symlinkType = os.platform() === 'win32' ? 'junction' : 'dir';
        fs.symlinkSync(resolvedPath, linkPath, symlinkType);
        log(t('success_local_source', { sourceName }), styles.green);
    } catch (e) {
        log(t('error_symlink', { message: e.message }), styles.red);
        return;
    }

    config.sources[sourceName] = { type: 'local', path: resolvedPath };
    saveConfig(config);
    log(t('info_use_hint_simple', { sourceName }), styles.yellow);
}

module.exports = {
    cloneSource,
    importSource
};
