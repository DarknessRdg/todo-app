/**
 * Which build of the app is on screen.
 *
 * There is no server to ask, and `package.json`'s version is not bumped — a
 * client-only app that ships on every push to main is identified by the commit
 * it was built from, not by a release number. `vite.config.ts` stamps the short
 * sha in at build time; a dev server has nothing to stamp, hence the fallback.
 */

/** What an unstamped build calls itself — a dev server, or a spec run. */
export const DevelopmentBuild = "dev";

/**
 * Reads the stamp the build left behind, falling back rather than showing an
 * empty slot: a version line that is sometimes blank is worse than one that
 * always says something.
 */
export function formatVersion(raw: unknown): string {
  if (typeof raw !== "string") return DevelopmentBuild;

  const stamped = raw.trim();
  return stamped === "" ? DevelopmentBuild : stamped;
}

/** The running build, read once — it cannot change while the page is open. */
export const AppVersion = formatVersion(import.meta.env.VITE_APP_VERSION);
