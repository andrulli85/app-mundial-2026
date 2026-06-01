/**
 * KNOWN_FLAGS.mjs
 *
 * Shared whitelist of accepted CLI flags for the sticker-extraction pipeline.
 * Any flag NOT in this set triggers exit 2 (per Mission Control CLI convention).
 */

export const KNOWN_FLAGS = new Set([
  "--country",
  "--dry-run",
  "--force",
  "--help",
]);

/**
 * Validate process.argv against KNOWN_FLAGS.
 * Flags of the form --key=value or --key value are both supported.
 * Exits with code 2 on any unknown flag.
 *
 * @param {string[]} argv - process.argv.slice(2)
 */
export function validateFlags(argv) {
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue; // positional value — skip
    const flagName = arg.includes("=") ? arg.split("=")[0] : arg;
    if (!KNOWN_FLAGS.has(flagName)) {
      console.error(`ERROR: Unknown flag: ${flagName}`);
      console.error(`Known flags: ${[...KNOWN_FLAGS].join(", ")}`);
      process.exit(2);
    }
  }
}

/**
 * Parse --key value or --key=value pairs from argv.
 * Boolean flags (no value) return true.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Record<string, string|boolean>}
 */
export function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    if (arg.includes("=")) {
      const [key, ...rest] = arg.slice(2).split("=");
      result[key] = rest.join("=");
    } else {
      const key = arg.slice(2);
      // peek at next token
      if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
        result[key] = argv[i + 1];
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}
