import { runExpanded } from './runner';
function discoverPort() {
    const host = process.env.OLLAMA_HOST;
    if (!host)
        return 11434;
    const colonIdx = host.lastIndexOf(':');
    if (colonIdx !== -1) {
        const port = parseInt(host.slice(colonIdx + 1), 10);
        if (!isNaN(port) && port > 0 && port <= 65535)
            return port;
    }
    return 11434;
}
export async function collectOllama() {
    const port = discoverPort();
    try {
        const output = await runExpanded(['lsof', '-i', `:${port}`], 5000);
        const lines = output.split('\n').filter(l => l.trim().length > 0);
        const portPattern = new RegExp(`\\*:${port}|0\\.0\\.0\\.0:${port}|\\[::\\]:${port}`);
        const hostPattern = new RegExp(`([\\d.]+):${port}|localhost:${port}|127\\.0\\.0\\.1:${port}`);
        for (const line of lines.slice(1)) {
            if (portPattern.test(line))
                return { ok: true, bound_to_public: true, host: '0.0.0.0', port, error: null };
            const hostMatch = line.match(hostPattern);
            if (hostMatch)
                return { ok: true, bound_to_public: false, host: hostMatch[1] ?? '127.0.0.1', port, error: null };
        }
        return { ok: true, bound_to_public: false, host: null, port, error: null };
    }
    catch {
        return { ok: true, bound_to_public: false, host: null, port, error: null };
    }
}
//# sourceMappingURL=ollama.js.map