import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runExpanded } from './runner';
const CONFIG_PATHS = [
    () => path.join(os.homedir(), '.cloudflared', 'config.yml'),
    () => '/etc/cloudflared/config.yml',
];
function findConfigPath() {
    for (const pathFn of CONFIG_PATHS) {
        const p = pathFn();
        if (fs.existsSync(p))
            return p;
    }
    return null;
}
function parseUnauthenticatedHostnames(content) {
    const lines = content.split('\n');
    const itemStarts = [];
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*-\s/.test(lines[i]))
            itemStarts.push(i);
    }
    const unauthenticated = [];
    for (let s = 0; s < itemStarts.length; s++) {
        const blockStart = itemStarts[s];
        const blockEnd = s + 1 < itemStarts.length ? itemStarts[s + 1] : lines.length;
        let hostname = null;
        let hasAccessRequired = false;
        for (let i = blockStart; i < blockEnd; i++) {
            const m = lines[i].match(/hostname:\s*(.+)/);
            if (m)
                hostname = m[1].trim();
            if (/access[._]required:\s*true/i.test(lines[i]))
                hasAccessRequired = true;
        }
        if (hostname && !hasAccessRequired)
            unauthenticated.push(hostname);
    }
    return unauthenticated;
}
async function detectOtherTunnels(cfConfigFound) {
    const tunnels = [];
    try {
        const psOutput = await runExpanded(['ps', 'aux'], 3000);
        const processes = ['ngrok', 'bore', 'frpc'];
        if (!cfConfigFound)
            processes.push('cloudflared');
        for (const proc of processes) {
            if (psOutput.split('\n').some(line => line.includes(proc) && !line.includes('ps aux')))
                tunnels.push(proc);
        }
    }
    catch { /* ps not available */ }
    try {
        const funnelOutput = await runExpanded(['tailscale', 'funnel', 'status'], 3000);
        if (funnelOutput.trim().length > 0)
            tunnels.push('tailscale funnel');
    }
    catch { /* tailscale not installed */ }
    return tunnels;
}
export async function collectCloudflareTunnel() {
    try {
        const configPath = findConfigPath();
        const otherTunnels = await detectOtherTunnels(configPath !== null);
        if (!configPath)
            return { ok: true, tunnel_found: false, unauthenticated_hostnames: [], other_tunnels_detected: otherTunnels, error: null };
        const content = fs.readFileSync(configPath, 'utf8');
        const unauthenticated = parseUnauthenticatedHostnames(content);
        return { ok: true, tunnel_found: true, unauthenticated_hostnames: unauthenticated, other_tunnels_detected: otherTunnels, error: null };
    }
    catch (err) {
        return { ok: false, tunnel_found: false, unauthenticated_hostnames: [], other_tunnels_detected: [], error: err.message };
    }
}
//# sourceMappingURL=cloudflare-tunnel.js.map