import { runExpanded } from './runner';
import * as fs from 'fs';
import * as os from 'os';
async function checkMacOS() {
    try {
        const output = await runExpanded(['softwareupdate', '-l'], 30000);
        return { ok: true, platform: 'macos', auto_updates_enabled: output.includes('No new software available'), error: null };
    }
    catch {
        return { ok: true, platform: 'macos', auto_updates_enabled: false, error: null };
    }
}
function checkLinux() {
    try {
        const configPath = '/etc/apt/apt.conf.d/20auto-upgrades';
        if (!fs.existsSync(configPath))
            return { ok: true, platform: 'linux', auto_updates_enabled: false, error: null };
        const content = fs.readFileSync(configPath, 'utf8');
        return { ok: true, platform: 'linux', auto_updates_enabled: content.includes('Unattended-Upgrade "1"'), error: null };
    }
    catch {
        return { ok: true, platform: 'linux', auto_updates_enabled: false, error: null };
    }
}
export async function collectOsUpdates() {
    try {
        const platform = os.platform();
        if (platform === 'darwin')
            return checkMacOS();
        if (platform === 'linux')
            return checkLinux();
        return { ok: true, platform: 'unknown', auto_updates_enabled: false, error: null };
    }
    catch (err) {
        return { ok: false, platform: 'unknown', auto_updates_enabled: false, error: err.message };
    }
}
//# sourceMappingURL=os-updates.js.map