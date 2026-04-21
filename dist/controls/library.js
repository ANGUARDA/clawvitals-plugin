/**
 * controls/library.ts — Control library loader.
 *
 * Loads the bundled control library JSON and validates its version
 * against the skill's expected version range.
 */
import libraryJson from './library.v1.0.json';
/**
 * Load and validate the bundled control library.
 *
 * @returns The validated control library
 * @throws Error if the library fails basic structural validation
 */
export function loadControlLibrary() {
    const lib = libraryJson;
    if (!lib || typeof lib.version !== 'string' || !Array.isArray(lib.controls)) {
        throw new Error('Control library failed structural validation');
    }
    return lib;
}
/**
 * Check if a library version is within an acceptable range.
 * Simple SemVer check: major must match, minor must be >= minimum.
 */
export function isLibraryVersionCompatible(version, expectedMajor, minMinor) {
    const [major, minor] = version.split('.').map(Number);
    return major === expectedMajor && minor >= minMinor;
}
//# sourceMappingURL=library.js.map