/**
 * controls/library.ts — Control library loader.
 *
 * Loads the bundled control library JSON and validates its version
 * against the skill's expected version range.
 */
import type { ControlLibrary } from '../types';
/**
 * Load and validate the bundled control library.
 *
 * @returns The validated control library
 * @throws Error if the library fails basic structural validation
 */
export declare function loadControlLibrary(): ControlLibrary;
/**
 * Check if a library version is within an acceptable range.
 * Simple SemVer check: major must match, minor must be >= minimum.
 */
export declare function isLibraryVersionCompatible(version: string, expectedMajor: number, minMinor: number): boolean;
//# sourceMappingURL=library.d.ts.map