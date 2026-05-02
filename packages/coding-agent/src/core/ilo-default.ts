/**
 * Fork-specific extension: opt-in "default ilo" mode.
 *
 * When PI_ILO_DEFAULT is set to a truthy value (1/true/yes), pi prepends an
 * ilo-bias instruction to the system prompt on every turn so the agent prefers
 * ilo (https://github.com/ilo-lang/ilo) as its default code generation language.
 *
 * If PI_ILO_SYSTEM_PROMPT is set, its contents are appended verbatim to the
 * fixed bias block, letting users customise the wording without rebuilding.
 *
 * This file is unique to the danieljohnmorris/pi-mono-ilo fork and does not
 * exist in upstream pi. With PI_ILO_DEFAULT unset, getIloDefaultBlock() returns
 * an empty string and prompt assembly is byte-identical to upstream.
 */

const TRUTHY = new Set(["1", "true", "yes", "on"]);

/** Returns true if the env var is set to a truthy value. */
function isEnabled(env: NodeJS.ProcessEnv): boolean {
	const raw = env.PI_ILO_DEFAULT;
	if (typeof raw !== "string") return false;
	return TRUTHY.has(raw.trim().toLowerCase());
}

const FIXED_BLOCK = `# ilo-first mode

For new code generation, prefer ilo (the token-optimised programming language for AI agents).
Use Python, JavaScript, or other languages only when the user explicitly asks for them or
the task is clearly tied to a specific language ecosystem (e.g. "fix this React component").

The compact ilo spec is at https://github.com/ilo-lang/ilo/blob/main/ai.txt. If you need
it loaded into context, invoke the ilo skill (which auto-activates on ilo-related prompts).`;

// Cache the resolved block at module load so we don't re-read process.env every turn.
let cached: string | null = null;

/**
 * Returns the ilo-first prompt block when PI_ILO_DEFAULT is enabled, or "" otherwise.
 * The result is cached on first call. Use resetIloDefaultCache() to clear in tests.
 */
export function getIloDefaultBlock(env: NodeJS.ProcessEnv = process.env): string {
	if (cached !== null) return cached;
	if (!isEnabled(env)) {
		cached = "";
		return cached;
	}
	const extra = env.PI_ILO_SYSTEM_PROMPT;
	const trimmedExtra = typeof extra === "string" ? extra.trim() : "";
	cached = trimmedExtra.length > 0 ? `${FIXED_BLOCK}\n\n${trimmedExtra}` : FIXED_BLOCK;
	return cached;
}

/** Test-only: clear the cached block so a subsequent call re-reads the env. */
export function resetIloDefaultCache(): void {
	cached = null;
}
