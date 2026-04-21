import { runExpanded } from './runner';
const MAX_CONTAINERS = 20;
const DANGEROUS_CAPS = ['SYS_ADMIN', 'NET_ADMIN', 'ALL'];
const CONTAINER_ID_RE = /^[0-9a-f]+$/i;
export async function collectDocker() {
    try {
        let ids;
        try {
            ids = await runExpanded(['docker', 'ps', '--format', '{{.ID}}'], 5000);
        }
        catch {
            return { ok: true, docker_available: false, containers: [], error: null };
        }
        const containerIds = ids.split('\n').map(l => l.trim()).filter(l => l.length > 0 && CONTAINER_ID_RE.test(l)).slice(0, MAX_CONTAINERS);
        if (containerIds.length === 0)
            return { ok: true, docker_available: true, containers: [], error: null };
        const containers = [];
        for (const id of containerIds) {
            try {
                const raw = await runExpanded(['docker', 'inspect', id], 5000);
                const inspected = JSON.parse(raw);
                const info = inspected[0];
                if (!info)
                    continue;
                const privileged = info.HostConfig?.Privileged === true;
                const user = info.Config?.User ?? '';
                const rootUser = user === '' || user === 'root' || user === '0';
                const capAdd = info.HostConfig?.CapAdd ?? [];
                const dangerousCaps = capAdd.filter(c => DANGEROUS_CAPS.includes(c));
                containers.push({ id: id.trim(), name: (info.Name ?? '').replace(/^\//, ''), privileged, root_user: rootUser, dangerous_caps: dangerousCaps });
            }
            catch { /* skip containers that fail to inspect */ }
        }
        return { ok: true, docker_available: true, containers, error: null };
    }
    catch (err) {
        return { ok: false, docker_available: false, containers: [], error: err.message };
    }
}
//# sourceMappingURL=docker.js.map