import fs from 'fs';
import path from 'path';
import os from 'os';
import { log, styles, ensureDir, resolveHome, getJSONMode } from './utils.js';
import { SOURCES_DIR, saveConfig } from './config.js';
import { t } from './i18n.js';
import { runGit } from './process.js';

export async function cloneSource(externalUrl, config) {
    const repoName = path.basename(externalUrl, '.git') || 'external-skills';
    const destDir = path.join(SOURCES_DIR, repoName);

    if (fs.existsSync(destDir)) {
        log(t('warn_source_exists', { repoName }), styles.yellow);
        try {
            await runGit(['pull'], { cwd: destDir });
            log(t('success_source_updated', { repoName }), styles.green);
        } catch {
            await runGit(['pull'], { cwd: destDir, reject: false });
        }
    } else {
        log(t('info_cloning', { repoName }), styles.cyan);
        try {
            ensureDir(SOURCES_DIR);
            await runGit(['clone', externalUrl, destDir], { stdio: getJSONMode() ? 'pipe' : 'inherit' });
            log(t('success_source_added', { repoName }), styles.green);
        } catch {
            log(t('error_clone_fail'), styles.red);
            return { ok: false, error: 'clone_failed', message: t('error_clone_fail') };
        }
    }

    config.sources[repoName] = { type: 'git', url: externalUrl };
    saveConfig(config);
    log(t('info_use_hint', { repoName }), styles.yellow);
    return { ok: true, type: 'git', name: repoName, input: externalUrl };
}

export async function importSource(localPath, config) {
    let resolvedPath;
    try {
        resolvedPath = fs.realpathSync(resolveHome(localPath));
    } catch {
        const errorMessage = t('error_path_not_found', { path: resolveHome(localPath) });
        log(errorMessage, styles.red);
        return { ok: false, error: 'path_not_found', message: errorMessage };
    }

    if (!fs.existsSync(resolvedPath)) {
        const errorMessage = t('error_path_not_found', { path: resolvedPath });
        log(errorMessage, styles.red);
        return { ok: false, error: 'path_not_found', message: errorMessage };
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
        return { ok: false, error: 'symlink_failed', message: t('error_symlink', { message: e.message }) };
    }

    config.sources[sourceName] = { type: 'local', path: resolvedPath };
    saveConfig(config);
    log(t('info_use_hint_simple', { sourceName }), styles.yellow);
    return { ok: true, type: 'local', name: sourceName, input: resolvedPath };
}
