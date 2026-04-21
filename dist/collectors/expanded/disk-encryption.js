import { runExpanded } from './runner';
import * as os from 'os';
async function checkMacOS() {
    try {
        const output = await runExpanded(['fdesetup', 'status'], 5000);
        return { ok: true, platform: 'macos', encrypted: output.includes('FileVault is On'), error: null };
    }
    catch {
        return { ok: true, platform: 'macos', encrypted: false, error: null };
    }
}
async function checkLinux() {
    try {
        const output = await runExpanded(['lsblk', '-f'], 5000);
        return { ok: true, platform: 'linux', encrypted: output.includes('crypto_LUKS'), error: null };
    }
    catch {
        return { ok: true, platform: 'linux', encrypted: false, error: null };
    }
}
export async function collectDiskEncryption() {
    try {
        const platform = os.platform();
        if (platform === 'darwin')
            return checkMacOS();
        if (platform === 'linux')
            return checkLinux();
        return { ok: true, platform: 'unknown', encrypted: false, error: null };
    }
    catch (err) {
        return { ok: false, platform: 'unknown', encrypted: false, error: err.message };
    }
}
//# sourceMappingURL=disk-encryption.js.map