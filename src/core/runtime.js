import fs from 'fs';

let runtime = {
    ci: false,
    json: false
};

export function setRuntimeOptions(options = {}) {
    const json = Boolean(options.json);
    const ci = Boolean(options.ci) || json;
    runtime = { ci, json };
}

export function getRuntimeOptions() {
    return { ...runtime };
}

export function getCIMode() {
    return runtime.ci;
}

export function getJSONMode() {
    return runtime.json;
}

export function jsonSuccess(data) {
    fs.writeSync(1, `${JSON.stringify({ ok: true, data }, null, 2)}\n`);
}

export function jsonError(error, message) {
    fs.writeSync(1, `${JSON.stringify({ ok: false, error, message }, null, 2)}\n`);
}

export function deprecate(message) {
    if (runtime.json) return;
    fs.writeSync(2, `[Deprecated] ${message}\n`);
}
