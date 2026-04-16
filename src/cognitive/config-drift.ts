/**
 * cognitive/config-drift.ts — Field-level configuration drift detection.
 *
 * Compares tracked fields between two CollectorResult snapshots to surface
 * exactly what changed between scans.
 */

import type { CollectorResult } from "../types.js";

export interface ConfigFieldChange {
  field: string;
  previous: unknown;
  current: unknown;
  change_type: "added" | "removed" | "changed";
}

export interface ConfigDriftResult {
  changes: ConfigFieldChange[];
  has_drift: boolean;
}

type FieldMap = Map<string, unknown>;

/**
 * Extract the tracked fields from a CollectorResult into a flat key→value map.
 */
function extractFields(sources: CollectorResult): FieldMap {
  const fields: FieldMap = new Map();

  // security_audit fields
  if (sources.security_audit.ok && sources.security_audit.data) {
    const sa = sources.security_audit.data;
    fields.set("security_audit.summary.critical", sa.summary.critical);
    fields.set("security_audit.summary.warn", sa.summary.warn);
    fields.set("security_audit.summary.info", sa.summary.info);

    for (const finding of sa.findings) {
      fields.set(`security_audit.finding.${finding.checkId}`, true);
    }
  }

  // health fields
  if (sources.health.ok && sources.health.data) {
    const h = sources.health.data;
    for (const [name, ch] of Object.entries(h.channels)) {
      fields.set(`channels.${name}.configured`, ch.configured);
      fields.set(`channels.${name}.probe.ok`, ch.probe.ok);
    }
  }

  // update_status fields
  if (sources.update_status.ok && sources.update_status.data) {
    const us = sources.update_status.data;
    fields.set("update.availability.hasRegistryUpdate", us.availability.hasRegistryUpdate);
    if (us.availability.latestVersion != null) {
      fields.set("update.availability.latestVersion", us.availability.latestVersion);
    }
    fields.set("update.channel.value", us.channel.value);
  }

  // version fields
  if (sources.version_cmd.ok && sources.version_cmd.version) {
    fields.set("version", sources.version_cmd.version);
  }

  return fields;
}

export function detectConfigDrift(
  current: CollectorResult,
  previous: CollectorResult,
): ConfigDriftResult {
  const currentFields = extractFields(current);
  const previousFields = extractFields(previous);

  const changes: ConfigFieldChange[] = [];

  // Check for added and changed fields
  for (const [field, currentVal] of currentFields) {
    if (!previousFields.has(field)) {
      changes.push({ field, previous: undefined, current: currentVal, change_type: "added" });
    } else {
      const prevVal = previousFields.get(field);
      if (!fieldEquals(currentVal, prevVal)) {
        changes.push({ field, previous: prevVal, current: currentVal, change_type: "changed" });
      }
    }
  }

  // Check for removed fields
  for (const [field, prevVal] of previousFields) {
    if (!currentFields.has(field)) {
      changes.push({ field, previous: prevVal, current: undefined, change_type: "removed" });
    }
  }

  return { changes, has_drift: changes.length > 0 };
}

function fieldEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
