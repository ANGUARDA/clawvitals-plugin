import { runExpanded } from './runner';
export const MANAGEMENT_PORTS = [
    { port: 22, service: 'SSH' },
    { port: 2375, service: 'Docker API (plaintext)' },
    { port: 2376, service: 'Docker API (TLS)' },
    { port: 4000, service: 'Dev/Admin Server' },
    { port: 5000, service: 'API/Dev Server' },
    { port: 8080, service: 'HTTP Proxy/Admin' },
    { port: 8443, service: 'HTTPS Admin' },
    { port: 8888, service: 'Jupyter/Admin' },
    { port: 9000, service: 'Management Console' },
    { port: 9090, service: 'Prometheus/Admin' },
];
async function tryLsof(port) {
    try {
        const output = await runExpanded(['lsof', '-i', `:${port}`, '-sTCP:LISTEN'], 5000);
        const lines = output.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines.slice(1)) {
            if (line.match(/\*:\d+|0\.0\.0\.0:\d+|\[::\]:\d+/))
                return { bound: true, bind: '0.0.0.0' };
        }
        if (lines.length > 1)
            return { bound: false, bind: '127.0.0.1' };
        return null;
    }
    catch {
        return null;
    }
}
async function trySs(port) {
    try {
        const output = await runExpanded(['ss', '-tlnp', `sport = :${port}`], 5000);
        const lines = output.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines.slice(1)) {
            if (line.includes('0.0.0.0:') || line.includes('*:') || line.includes('[::]:'))
                return { bound: true, bind: '0.0.0.0' };
            if (line.includes('127.0.0.1:') || line.includes('[::1]:'))
                return { bound: false, bind: '127.0.0.1' };
        }
        return null;
    }
    catch {
        return null;
    }
}
function isValidPort(entry) {
    return Number.isInteger(entry.port) && entry.port >= 1 && entry.port <= 65535;
}
export async function collectNetwork(ports) {
    try {
        const portList = ports ?? MANAGEMENT_PORTS;
        const invalid = portList.filter(e => !isValidPort(e));
        const validPorts = portList.filter(isValidPort);
        const exposed = [];
        for (const { port, service } of validPorts) {
            const result = (await tryLsof(port)) ?? (await trySs(port));
            if (result?.bound)
                exposed.push({ port, service, bind: result.bind });
        }
        const error = invalid.length > 0 ? `Skipped invalid extra_ports: ${invalid.map(e => JSON.stringify(e.port)).join(', ')}` : null;
        return { ok: true, exposed_ports: exposed, error };
    }
    catch (err) {
        return { ok: false, exposed_ports: [], error: err.message };
    }
}
//# sourceMappingURL=network.js.map