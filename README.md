# ClawVitals Plugin

Security vitals checker for self-hosted [OpenClaw](https://openclaw.ai) installations. Recurring security checks, scan history, delta detection, and regression-aware alerting.

> This is the **plugin** — the stateful, scheduled upgrade from the [ClawVitals Skill](https://clawhub.ai/bk-cm/clawvitals).

---

## Contents

- [Skill vs Plugin](#skill-vs-plugin)
- [Install](#install)
- [Uninstall](#uninstall)
- [Commands](#commands)
- [Agent tools](#agent-tools)
- [Standard vs Expanded controls](#standard-vs-expanded-controls)
- [Example output](#example-output)
- [Regression alerts](#regression-alerts)
- [Scheduling](#scheduling)
- [Fleet Management](#fleet-management)
- [Exclusion management](#exclusion-management)
- [Telemetry](#telemetry)
- [Configuration](#configuration)
- [License](#license)

---

## Skill vs Plugin

The **ClawVitals skill** (on ClawHub) is stateless — it runs a point-in-time scan, prints the result, and stores nothing. No telemetry, no network calls, no persistent state.

The **plugin** is the upgrade path. It adds everything the skill deliberately omits:

| Feature | Skill | Plugin |
|---|---|---|
| Scan and score | ✅ | ✅ |
| Remediation steps | ✅ | ✅ |
| Extended controls | ✅ | ✅ |
| Scan history and delta detection | ❌ | ✅ |
| Recurring scheduled scans | ❌ | ✅ |
| Regression and critical alerts | ❌ | ✅ |
| Exclusion management | ❌ | ✅ |
| Posture trend dashboard | ❌ | ✅ |
| Fleet management (alias) | ❌ | ✅ |
| Config tamper detection | ❌ | ✅ |
| Telemetry | none | **on by default (opt-out)** |

---

## Install

ClawVitals Plugin is published on [ClawHub](https://clawhub.ai/plugins/claw-security-vitals).

```bash
openclaw plugins install clawhub:claw-security-vitals
```

After installing, run your first scan:

```
run clawvitals
```

---

## Uninstall

```bash
openclaw plugins uninstall claw-security-vitals
```

After uninstalling, `run clawvitals` will fall back to the skill if it is still installed, or return a "not found" error if neither is installed.

> **Note:** Uninstalling does not delete your scan history. Run files are stored at `{workspace}/clawvitals/runs/` and are retained according to your configured retention policy (default: 90 days). To remove all data, delete this directory manually.

---

## Commands

These are chat commands you type directly in your OpenClaw messaging surface:

| Command | Description |
|---|---|
| `run clawvitals` | Run a full security scan (standard controls) |
| `run clawvitals --expanded` | Run scan with expanded system-level controls |
| `run clawvitals --standard` | Run scan with standard controls only (explicit) |
| `show clawvitals details` | Full report with all findings and remediation steps |
| `clawvitals status` | Show last scan time, score, schedule, and plan status |
| `clawvitals help` | Show command reference |

---

## Agent tools

The following tools are invoked by the agent. You can trigger them via natural language — for example, say "set clawvitals schedule to daily" and the agent will call the appropriate tool.

| Tool | Description |
|---|---|
| `clawvitals_set_alias` | Set a friendly name for this host in reports and dashboard |
| `clawvitals_show_identity` | Show install UUID, alias, and dashboard link |
| `clawvitals_telemetry` | Enable or disable telemetry |
| `clawvitals_set_schedule` | Configure recurring scan cadence |
| `clawvitals_status` | Show current status |
| `clawvitals_trial_status` | Show trial status and upgrade options |
| `clawvitals_upgrade` | Upgrade to a paid plan |
| `clawvitals_configure_webhook` | Set up a webhook for alert delivery |
| `clawvitals_exclude` | Suppress a finding with a reason |
| `clawvitals_list_exclusions` | List all active exclusions |
| `clawvitals_remove_exclusion` | Remove an exclusion |
| `clawvitals_get_report` | Retrieve a scan report |
| `clawvitals_approve_cognitive_file` | Approve a cognitive file |

---

## Standard vs Expanded controls

By default the plugin runs in **standard mode** — the same OpenClaw-native control set as the skill, plus scan history, delta detection, and alerting. Standard mode uses only the OpenClaw CLI and requires no additional permissions.

**Expanded mode** adds a second layer of system-level checks that require direct filesystem and shell access.

### Switch to expanded mode

```
run clawvitals --expanded         # one-off expanded scan
run clawvitals --standard         # one-off standard scan (explicit default)
```

Or set it as your default in config:
```json
{
  "controls": { "mode": "expanded" }
}
```

### What expanded mode adds

| ID | Control | Severity | What it checks |
|---|---|---|---|
| **NC-OLLAMA-001** | Ollama not externally accessible | Critical | Checks whether Ollama is running and if port 11434 is bound to a public interface. |
| **NC-NET-001** | Management interfaces not internet-exposed | Critical | Scans open ports for SSH (22), Docker API (2375/2376), and common admin dashboards. |
| **NC-SECRET-001** | No secrets in env/config files | Critical | Regex-scans `~/.env`, `.envrc`, and common config files for API key patterns. |
| **NC-SECRET-002** | No API keys in shell history | High | Scans shell history files for secret patterns. |
| **NC-TUNNEL-001** | Cloudflare tunnel endpoints authenticated | High | Checks `~/.cloudflared/` config to confirm tunnel-exposed services require authentication. |
| **NC-DOCKER-001** | Containers not running as root or privileged | High | Runs `docker inspect` on running containers to check for dangerous privilege grants. |
| **NC-OS-001** | OS auto-updates enabled | High | Checks that automatic OS updates are enabled. |
| **NC-OS-002** | Disk encryption enabled | High | Checks FileVault status (macOS) or LUKS encryption (Linux). |

All expanded checks are **read-only** — nothing is modified. See the [security policy](https://github.com/ANGUARDA/clawvitals-plugin/blob/main/SECURITY.md) for the full list of commands and file paths accessed.

---

## Example output

### Summary (after `run clawvitals`)

```
ClawVitals Plugin 🔌

🔴 Security Score: 58 / 100  ·  RED
Host: mac-mini-home  ·  Scanned: 2026-04-15 15:38 BST

Findings: 2 Critical  ·  1 High  ·  1 Medium
Delta: ▲ 1 new finding since last scan (2026-04-08)

CRITICAL  NC-OC-012  Gateway auth disabled
CRITICAL  NC-OC-003  Command policy: deny-only mode
HIGH      NC-VERS-001  OpenClaw update available
MEDIUM    NC-OC-008  Channel health degraded

Reply "show clawvitals details" for full report with remediation steps.
📈 Track your scans → https://clawvitals.io/dashboard
```

### `clawvitals status` output

```
ClawVitals Plugin 🔌

Last scan:   2026-04-15 15:38 BST
Score:       58 / 100  🔴 RED
Schedule:    Weekly (Mondays 8:00am)
Next scan:   2026-04-20 08:00 BST
Host alias:  mac-mini-home
```

---

## Regression alerts

When a scheduled scan detects new Critical or High findings that were not present in the previous scan, the plugin sends a **regression alert** to your OpenClaw messaging surface.

- Alerts fire **only for new Critical or High findings**.
- Medium, Low, and Info findings are in the full report but do not trigger an alert on their own.
- If no new Critical/High findings, scheduled scans run **silently**.
- On the **first ever scan** (no prior baseline), all findings are treated as new and the full report is sent.
- To route alerts to a webhook, use the `clawvitals_configure_webhook` agent tool.

### Delivery channels

| Channel | Configured by |
|---|---|
| OpenClaw messaging surface (default) | Automatic |
| Webhook (Slack, Discord, Teams, etc.) | `clawvitals_configure_webhook` agent tool |
| Email digest | Coming soon |

---

## Scheduling

Configure the scan schedule via the `clawvitals_set_schedule` agent tool, or say something like "set clawvitals schedule to daily" in natural language. The default cron schedule is 9 AM daily.

Available cadences: daily, weekly, monthly, or none (manual only).

---

## Fleet Management

Give each installation a human-readable alias for the dashboard using the `clawvitals_set_alias` agent tool. For example:

```
set alias for clawvitals to prod-server-1
set alias for clawvitals to dev-laptop
```

The alias is always user-set — never derived from the machine hostname or any system identifier. To view your current install identity, use the `clawvitals_show_identity` agent tool.

---

## Exclusion management

Suppress findings that are intentional or not applicable using the `clawvitals_exclude` agent tool:

```
exclude NC-OC-005 from clawvitals because "personal assistant setup"
exclude NC-AUTH-001 from clawvitals because "no reverse proxy, local-only" expires 2026-09-01
```

Exclusions appear as `EXCLUDED` in scan reports — never silently hidden. To list exclusions, use `clawvitals_list_exclusions`. To remove one, use `clawvitals_remove_exclusion`.

---

## Telemetry

The plugin defaults telemetry **on**. This is intentional: the plugin exists to power [clawvitals.io/dashboard](https://clawvitals.io/dashboard) — without telemetry, the dashboard has no data.

**What is sent:**
- Plugin version, control library version
- Numeric score and band (green/amber/red)
- FAIL count, PASS count
- Total lifetime scan count
- Scheduled/manual flag
- Random install UUID generated at plugin install time
- Alias — only if you explicitly set one

**What is never sent:**
- Hostnames, usernames, IP addresses, or file paths
- Finding details, control IDs, or failure reasons
- OpenClaw config, tokens, credentials, or secrets

**Opt out** using the `clawvitals_telemetry` agent tool, or say "turn off clawvitals telemetry".

---

## Configuration

```json
{
  "plugins": {
    "entries": {
      "clawvitals": {
        "telemetry": {
          "enabled": true,
          "alias": "prod-server-1"
        },
        "schedule": {
          "enabled": true,
          "cron": "0 9 * * *"
        },
        "alerts": {
          "on_regression": true,
          "on_new_critical": true,
          "threshold": "high"
        },
        "controls": {
          "mode": "standard"
        },
        "retention_days": 90
      }
    }
  }
}
```

---

## Links

- [clawvitals.io](https://clawvitals.io)
- [Dashboard](https://clawvitals.io/dashboard)
- [Docs](https://clawvitals.io/docs)
- [Controls reference](https://clawvitals.io/docs/controls)
- [ClawHub plugin listing](https://clawhub.ai/plugins/claw-security-vitals)
- [GitHub](https://github.com/ANGUARDA/clawvitals-plugin)
- [Security policy](https://github.com/ANGUARDA/clawvitals-plugin/blob/main/SECURITY.md)

---

## License

MIT
