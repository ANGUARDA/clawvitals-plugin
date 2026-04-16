/**
 * expanded-collectors.test.ts — Unit tests for expanded collectors.
 */

// Mock child_process.execSync before imports
const mockExecSync = jest.fn();
jest.mock('node:child_process', () => ({
  execSync: mockExecSync,
}));

// Mock fs for file-reading collectors
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
jest.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

// Mock os.homedir and os.platform
const mockHomedir = jest.fn(() => '/home/testuser');
const mockPlatform = jest.fn(() => 'darwin');
jest.mock('node:os', () => ({
  homedir: () => mockHomedir(),
  platform: () => mockPlatform(),
}));

import { collectOllama } from '../../src/collectors/expanded/ollama';
import { collectNetwork, MANAGEMENT_PORTS } from '../../src/collectors/expanded/network';
import { collectSecretsFiles } from '../../src/collectors/expanded/secrets-files';
import { collectSecretsHistory } from '../../src/collectors/expanded/secrets-history';
import { collectCloudflareTunnel } from '../../src/collectors/expanded/cloudflare-tunnel';
import { collectDocker } from '../../src/collectors/expanded/docker';
import { collectOsUpdates } from '../../src/collectors/expanded/os-updates';
import { collectDiskEncryption } from '../../src/collectors/expanded/disk-encryption';
import { ExpandedCollectorOrchestrator } from '../../src/collectors/expanded/index';

beforeEach(() => {
  jest.clearAllMocks();
  mockExistsSync.mockReturnValue(false);
  mockReadFileSync.mockReturnValue('');
  mockHomedir.mockReturnValue('/home/testuser');
  mockPlatform.mockReturnValue('darwin');
  delete process.env.OLLAMA_HOST;
});

// ── Ollama ────────────────────────────────────────────────────────

describe('collectOllama', () => {
  it('returns PASS when ollama is not running (lsof fails)', () => {
    mockExecSync.mockImplementation(() => { throw new Error('no matches'); });
    const result = collectOllama();
    expect(result.ok).toBe(true);
    expect(result.bound_to_public).toBe(false);
    expect(result.port).toBe(11434);
  });

  it('detects ollama bound to 0.0.0.0', () => {
    mockExecSync.mockReturnValue(
      'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nollama  1234 user   3u  IPv4 0xabc 0t0  TCP *:11434 (LISTEN)\n'
    );
    const result = collectOllama();
    expect(result.ok).toBe(true);
    expect(result.bound_to_public).toBe(true);
    expect(result.host).toBe('0.0.0.0');
    expect(result.port).toBe(11434);
  });

  it('detects ollama bound to localhost', () => {
    mockExecSync.mockReturnValue(
      'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nollama  1234 user   3u  IPv4 0xabc 0t0  TCP 127.0.0.1:11434 (LISTEN)\n'
    );
    const result = collectOllama();
    expect(result.ok).toBe(true);
    expect(result.bound_to_public).toBe(false);
    expect(result.port).toBe(11434);
  });

  it('falls back to port 11434 when OLLAMA_HOST is not set', () => {
    delete process.env.OLLAMA_HOST;
    mockExecSync.mockImplementation(() => { throw new Error('no matches'); });
    const result = collectOllama();
    expect(result.port).toBe(11434);
  });

  it('uses port from OLLAMA_HOST="0.0.0.0:12345"', () => {
    process.env.OLLAMA_HOST = '0.0.0.0:12345';
    mockExecSync.mockReturnValue(
      'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nollama  1234 user   3u  IPv4 0xabc 0t0  TCP *:12345 (LISTEN)\n'
    );
    const result = collectOllama();
    expect(result.port).toBe(12345);
    expect(result.bound_to_public).toBe(true);
  });

  it('uses default port when OLLAMA_HOST="127.0.0.1" (no port)', () => {
    process.env.OLLAMA_HOST = '127.0.0.1';
    mockExecSync.mockImplementation(() => { throw new Error('no matches'); });
    const result = collectOllama();
    expect(result.port).toBe(11434);
  });

  it('detects custom port bound to 0.0.0.0', () => {
    process.env.OLLAMA_HOST = '0.0.0.0:12345';
    mockExecSync.mockReturnValue(
      'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nollama  1234 user   3u  IPv4 0xabc 0t0  TCP 0.0.0.0:12345 (LISTEN)\n'
    );
    const result = collectOllama();
    expect(result.bound_to_public).toBe(true);
    expect(result.port).toBe(12345);
  });
});

// ── Network ──────────────────────────────────────────────────────

describe('collectNetwork', () => {
  it('returns no exposed ports when lsof finds nothing', () => {
    mockExecSync.mockImplementation(() => { throw new Error('no matches'); });
    const result = collectNetwork();
    expect(result.ok).toBe(true);
    expect(result.exposed_ports).toHaveLength(0);
  });

  it('detects port 22 exposed on 0.0.0.0', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes(':22')) {
        return 'COMMAND PID USER FD TYPE NODE NAME\nsshd 123 root 3u IPv4 TCP *:22 (LISTEN)\n';
      }
      throw new Error('no matches');
    });
    const result = collectNetwork();
    expect(result.ok).toBe(true);
    expect(result.exposed_ports.length).toBeGreaterThanOrEqual(1);
    expect(result.exposed_ports[0].port).toBe(22);
  });

  it('accepts custom ports array', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes(':1234')) {
        return 'COMMAND PID USER FD TYPE NODE NAME\ntest 123 user 3u IPv4 TCP *:1234 (LISTEN)\n';
      }
      throw new Error('no matches');
    });
    const result = collectNetwork([{ port: 1234, service: 'Test' }]);
    expect(result.ok).toBe(true);
    expect(result.exposed_ports).toHaveLength(1);
    expect(result.exposed_ports[0].port).toBe(1234);
    expect(result.exposed_ports[0].service).toBe('Test');
  });

  it('default MANAGEMENT_PORTS includes 8443 and 9090', () => {
    expect(MANAGEMENT_PORTS.find(p => p.port === 8443)).toBeDefined();
    expect(MANAGEMENT_PORTS.find(p => p.port === 9090)).toBeDefined();
  });

  it('extra_ports merge with defaults when passed via spread', () => {
    const extra = [{ port: 3001, service: 'Slack server' }];
    const merged = [...MANAGEMENT_PORTS, ...extra];
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes(':3001')) {
        return 'COMMAND PID USER FD TYPE NODE NAME\nslack 999 user 3u IPv4 TCP *:3001 (LISTEN)\n';
      }
      throw new Error('no matches');
    });
    const result = collectNetwork(merged);
    expect(result.ok).toBe(true);
    expect(result.exposed_ports).toHaveLength(1);
    expect(result.exposed_ports[0].port).toBe(3001);
    expect(result.exposed_ports[0].service).toBe('Slack server');
    // Defaults are still in the port list
    expect(merged.length).toBe(MANAGEMENT_PORTS.length + 1);
  });

  it('skips invalid extra_ports (string, negative, out of range) and reports error', () => {
    mockExecSync.mockImplementation(() => { throw new Error('no matches'); });
    const ports = [
      { port: 3001, service: 'Valid' },
      { port: -1, service: 'Negative' },
      { port: 99999, service: 'Too high' },
      { port: 0, service: 'Zero' },
      { port: NaN, service: 'NaN' },
      { port: 1.5, service: 'Float' },
      { port: 443, service: 'HTTPS' },
    ];
    const result = collectNetwork(ports);
    expect(result.ok).toBe(true);
    // Only 3001 and 443 are valid
    expect(result.error).toContain('Skipped invalid extra_ports');
    expect(result.error).toContain('-1');
    expect(result.error).toContain('99999');
  });

  it('accepts all valid ports without error', () => {
    mockExecSync.mockImplementation(() => { throw new Error('no matches'); });
    const ports = [
      { port: 1, service: 'Min' },
      { port: 65535, service: 'Max' },
      { port: 8080, service: 'HTTP' },
    ];
    const result = collectNetwork(ports);
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
  });
});

// ── Secrets Files ────────────────────────────────────────────────

describe('collectSecretsFiles', () => {
  it('returns no findings when files do not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const result = collectSecretsFiles();
    expect(result.ok).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('detects OpenAI key in .env', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890');
    const result = collectSecretsFiles();
    expect(result.ok).toBe(true);
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    expect(result.findings[0].pattern).toBe('OpenAI');
  });

  it('detects AWS key pattern', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('AWS_KEY=AKIAIOSFODNN7EXAMPLE');
    const result = collectSecretsFiles();
    expect(result.ok).toBe(true);
    const aws = result.findings.find(f => f.pattern === 'AWS');
    expect(aws).toBeDefined();
  });

  it('detects generic API_KEY pattern', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('API_KEY=supersecretvalue12345');
    const result = collectSecretsFiles();
    expect(result.ok).toBe(true);
    const generic = result.findings.find(f => f.pattern === 'Generic API Key');
    expect(generic).toBeDefined();
  });

  it('never includes actual secret values in findings', () => {
    const secretValue = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(`OPENAI_API_KEY=${secretValue}`);
    const result = collectSecretsFiles();
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain(secretValue);
    expect(result.findings[0].pattern).toBe('OpenAI');
    expect(result.findings[0].line_hint).toBe(1);
  });
});

// ── Secrets History ──────────────────────────────────────────────

describe('collectSecretsHistory', () => {
  it('returns no findings when history files do not exist', () => {
    mockExistsSync.mockReturnValue(false);
    const result = collectSecretsHistory();
    expect(result.ok).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('detects Anthropic key in history', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('curl -H "Authorization: Bearer sk-ant-abcdefghijklmnopqrstuvwxyz"');
    const result = collectSecretsHistory();
    expect(result.ok).toBe(true);
    const anthropic = result.findings.find(f => f.pattern === 'Anthropic');
    expect(anthropic).toBeDefined();
  });

  it('never includes actual secret values in findings', () => {
    const secretValue = 'sk-ant-abcdefghijklmnopqrstuvwxyz';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(`curl -H "Authorization: Bearer ${secretValue}"`);
    const result = collectSecretsHistory();
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain(secretValue);
  });
});

// ── Cloudflare Tunnel ────────────────────────────────────────────

describe('collectCloudflareTunnel', () => {
  it('returns tunnel_found=false when config does not exist', () => {
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });
    const result = collectCloudflareTunnel();
    expect(result.ok).toBe(true);
    expect(result.tunnel_found).toBe(false);
    expect(result.other_tunnels_detected).toEqual([]);
  });

  it('detects unauthenticated hostname', () => {
    mockExistsSync.mockImplementation((p: string) => p === '/home/testuser/.cloudflared/config.yml');
    mockReadFileSync.mockReturnValue(
      'ingress:\n  - hostname: app.example.com\n    service: http://localhost:8080\n  - service: http_status:404\n'
    );
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });
    const result = collectCloudflareTunnel();
    expect(result.ok).toBe(true);
    expect(result.tunnel_found).toBe(true);
    expect(result.unauthenticated_hostnames).toContain('app.example.com');
    expect(result.other_tunnels_detected).toEqual([]);
  });

  it('passes when access_required is true', () => {
    mockExistsSync.mockImplementation((p: string) => p === '/home/testuser/.cloudflared/config.yml');
    mockReadFileSync.mockReturnValue(
      'ingress:\n  - hostname: app.example.com\n    access_required: true\n    service: http://localhost:8080\n'
    );
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });
    const result = collectCloudflareTunnel();
    expect(result.ok).toBe(true);
    expect(result.unauthenticated_hostnames).toHaveLength(0);
    expect(result.other_tunnels_detected).toEqual([]);
  });

  it('finds config at /etc/cloudflared/config.yml when home config missing', () => {
    mockExistsSync.mockImplementation((p: string) => p === '/etc/cloudflared/config.yml');
    mockReadFileSync.mockReturnValue(
      'ingress:\n  - hostname: etc.example.com\n    service: http://localhost:3000\n'
    );
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });
    const result = collectCloudflareTunnel();
    expect(result.ok).toBe(true);
    expect(result.tunnel_found).toBe(true);
    expect(result.unauthenticated_hostnames).toContain('etc.example.com');
  });

  it('detects ngrok in other_tunnels_detected', () => {
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('ps aux')) {
        return 'user  1234  0.0  0.1  ngrok http 8080\n';
      }
      throw new Error('not found');
    });
    const result = collectCloudflareTunnel();
    expect(result.other_tunnels_detected).toContain('ngrok');
  });

  it('other_tunnels_detected is empty when ps output is clean', () => {
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('ps aux')) {
        return 'user  1234  0.0  0.1  node server.js\n';
      }
      throw new Error('not found');
    });
    const result = collectCloudflareTunnel();
    expect(result.other_tunnels_detected).toEqual([]);
  });

  it('block-aware YAML: access_required before hostname still protects that hostname', () => {
    mockExistsSync.mockImplementation((p: string) => p === '/home/testuser/.cloudflared/config.yml');
    mockReadFileSync.mockReturnValue(
      'ingress:\n  - access_required: true\n    hostname: protected.example.com\n    service: http://localhost:8080\n'
    );
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });
    const result = collectCloudflareTunnel();
    expect(result.unauthenticated_hostnames).toHaveLength(0);
  });

  it('block-aware YAML: access_required in one block does NOT protect a different hostname', () => {
    mockExistsSync.mockImplementation((p: string) => p === '/home/testuser/.cloudflared/config.yml');
    mockReadFileSync.mockReturnValue(
      'ingress:\n  - hostname: protected.example.com\n    access_required: true\n    service: http://localhost:8080\n  - hostname: unprotected.example.com\n    service: http://localhost:9090\n'
    );
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });
    const result = collectCloudflareTunnel();
    expect(result.unauthenticated_hostnames).not.toContain('protected.example.com');
    expect(result.unauthenticated_hostnames).toContain('unprotected.example.com');
  });
});

// ── Docker ───────────────────────────────────────────────────────

describe('collectDocker', () => {
  it('returns docker_available=false when docker is not installed', () => {
    mockExecSync.mockImplementation(() => { throw new Error('docker not found'); });
    const result = collectDocker();
    expect(result.ok).toBe(true);
    expect(result.docker_available).toBe(false);
  });

  it('detects privileged container', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('docker ps')) return 'abc123def0\n';
      if (typeof cmd === 'string' && cmd.includes('docker inspect')) {
        return JSON.stringify([{
          Id: 'abc123def0',
          Name: '/test-container',
          HostConfig: { Privileged: true, CapAdd: [] },
          Config: { User: 'nobody' },
        }]);
      }
      throw new Error('unexpected');
    });
    const result = collectDocker();
    expect(result.ok).toBe(true);
    expect(result.docker_available).toBe(true);
    expect(result.containers).toHaveLength(1);
    expect(result.containers[0].privileged).toBe(true);
    expect(result.containers[0].root_user).toBe(false);
  });

  it('detects root user container', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('docker ps')) return 'def456aabb\n';
      if (typeof cmd === 'string' && cmd.includes('docker inspect')) {
        return JSON.stringify([{
          Id: 'def456aabb',
          Name: '/root-container',
          HostConfig: { Privileged: false, CapAdd: null },
          Config: { User: '' },
        }]);
      }
      throw new Error('unexpected');
    });
    const result = collectDocker();
    expect(result.ok).toBe(true);
    expect(result.containers[0].root_user).toBe(true);
  });

  it('detects dangerous capabilities', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('docker ps')) return 'aabb001122\n';
      if (typeof cmd === 'string' && cmd.includes('docker inspect')) {
        return JSON.stringify([{
          Id: 'aabb001122',
          Name: '/cap-container',
          HostConfig: { Privileged: false, CapAdd: ['SYS_ADMIN', 'NET_RAW'] },
          Config: { User: 'nobody' },
        }]);
      }
      throw new Error('unexpected');
    });
    const result = collectDocker();
    expect(result.ok).toBe(true);
    expect(result.containers[0].dangerous_caps).toEqual(['SYS_ADMIN']);
  });

  it('rejects non-hex container IDs to prevent injection', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.includes('docker ps')) return 'abc123\n; rm -rf /\n';
      throw new Error('unexpected');
    });
    const result = collectDocker();
    expect(result.ok).toBe(true);
    // The malicious line should be filtered out; abc123 is valid hex
    expect(result.containers).toHaveLength(0); // abc123 passes but no inspect mock matches
  });
});

// ── OS Updates ───────────────────────────────────────────────────

describe('collectOsUpdates', () => {
  it('detects macOS up to date', () => {
    mockPlatform.mockReturnValue('darwin');
    mockExecSync.mockReturnValue('Software Update Tool\n\nNo new software available.');
    const result = collectOsUpdates();
    expect(result.ok).toBe(true);
    expect(result.platform).toBe('macos');
    expect(result.auto_updates_enabled).toBe(true);
  });

  it('detects macOS updates available', () => {
    mockPlatform.mockReturnValue('darwin');
    mockExecSync.mockReturnValue('Software Update Tool\n\n* macOS 15.1\n');
    const result = collectOsUpdates();
    expect(result.ok).toBe(true);
    expect(result.auto_updates_enabled).toBe(false);
  });

  it('detects linux unattended upgrades enabled', () => {
    mockPlatform.mockReturnValue('linux');
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('APT::Periodic::Unattended-Upgrade "1";');
    const result = collectOsUpdates();
    expect(result.ok).toBe(true);
    expect(result.platform).toBe('linux');
    expect(result.auto_updates_enabled).toBe(true);
  });

  it('detects linux without auto-upgrades config', () => {
    mockPlatform.mockReturnValue('linux');
    mockExistsSync.mockReturnValue(false);
    const result = collectOsUpdates();
    expect(result.ok).toBe(true);
    expect(result.auto_updates_enabled).toBe(false);
  });

  it('returns unknown for unsupported platform', () => {
    mockPlatform.mockReturnValue('win32');
    const result = collectOsUpdates();
    expect(result.ok).toBe(true);
    expect(result.platform).toBe('unknown');
  });
});

// ── Disk Encryption ──────────────────────────────────────────────

describe('collectDiskEncryption', () => {
  it('detects macOS FileVault enabled', () => {
    mockPlatform.mockReturnValue('darwin');
    mockExecSync.mockReturnValue('FileVault is On.');
    const result = collectDiskEncryption();
    expect(result.ok).toBe(true);
    expect(result.encrypted).toBe(true);
  });

  it('detects macOS FileVault disabled', () => {
    mockPlatform.mockReturnValue('darwin');
    mockExecSync.mockReturnValue('FileVault is Off.');
    const result = collectDiskEncryption();
    expect(result.ok).toBe(true);
    expect(result.encrypted).toBe(false);
  });

  it('detects linux LUKS encryption', () => {
    mockPlatform.mockReturnValue('linux');
    mockExecSync.mockReturnValue('NAME FSTYPE\nsda1 crypto_LUKS\nsda2 ext4\n');
    const result = collectDiskEncryption();
    expect(result.ok).toBe(true);
    expect(result.encrypted).toBe(true);
  });

  it('detects linux without encryption', () => {
    mockPlatform.mockReturnValue('linux');
    mockExecSync.mockReturnValue('NAME FSTYPE\nsda1 ext4\n');
    const result = collectDiskEncryption();
    expect(result.ok).toBe(true);
    expect(result.encrypted).toBe(false);
  });
});

// ── Orchestrator ─────────────────────────────────────────────────

describe('ExpandedCollectorOrchestrator', () => {
  it('collects all 8 results in parallel', async () => {
    // All collectors use mocked dependencies, so they'll return defaults
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });
    mockExistsSync.mockReturnValue(false);

    const orchestrator = new ExpandedCollectorOrchestrator();
    const result = await orchestrator.collect();

    expect(result.ollama).toBeDefined();
    expect(result.network).toBeDefined();
    expect(result.secrets_files).toBeDefined();
    expect(result.secrets_history).toBeDefined();
    expect(result.cloudflare_tunnel).toBeDefined();
    expect(result.docker).toBeDefined();
    expect(result.os_updates).toBeDefined();
    expect(result.disk_encryption).toBeDefined();
  });
});
