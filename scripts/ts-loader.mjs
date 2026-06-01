/**
 * Node ESM loader — resolves extensionless imports to .ts files.
 * Used by: node --loader scripts/ts-loader.mjs --experimental-strip-types
 *
 * Only active during test runs, never bundled.
 */

import { resolve as pathResolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { existsSync } from "fs";

const TS_EXTENSIONS = [".ts", ".tsx"];

export async function resolve(specifier, context, nextResolve) {
  // Skip node_modules and already-extended specifiers
  if (
    specifier.startsWith("node:") ||
    specifier.startsWith("http") ||
    /\.[a-z]+$/.test(specifier)
  ) {
    return nextResolve(specifier, context);
  }

  // Resolve relative imports without extension
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const parentDir = context.parentURL
      ? fileURLToPath(new URL(".", context.parentURL))
      : process.cwd();
    for (const ext of TS_EXTENSIONS) {
      const candidate = pathResolve(parentDir, specifier + ext);
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}
