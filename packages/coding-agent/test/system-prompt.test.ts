import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { resetIloDefaultCache } from "../src/core/ilo-default.js";
import { buildSystemPrompt } from "../src/core/system-prompt.js";

describe("buildSystemPrompt", () => {
	describe("empty tools", () => {
		test("shows (none) for empty tools list", () => {
			const prompt = buildSystemPrompt({
				selectedTools: [],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).toContain("Available tools:\n(none)");
		});

		test("shows file paths guideline even with no tools", () => {
			const prompt = buildSystemPrompt({
				selectedTools: [],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).toContain("Show file paths clearly");
		});
	});

	describe("default tools", () => {
		test("includes all default tools when snippets are provided", () => {
			const prompt = buildSystemPrompt({
				toolSnippets: {
					read: "Read file contents",
					bash: "Execute bash commands",
					edit: "Make surgical edits",
					write: "Create or overwrite files",
				},
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).toContain("- read:");
			expect(prompt).toContain("- bash:");
			expect(prompt).toContain("- edit:");
			expect(prompt).toContain("- write:");
		});
	});

	describe("custom tool snippets", () => {
		test("includes custom tools in available tools section when promptSnippet is provided", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "dynamic_tool"],
				toolSnippets: {
					dynamic_tool: "Run dynamic test behavior",
				},
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).toContain("- dynamic_tool: Run dynamic test behavior");
		});

		test("omits custom tools from available tools section when promptSnippet is not provided", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "dynamic_tool"],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).not.toContain("dynamic_tool");
		});
	});

	describe("prompt guidelines", () => {
		test("appends promptGuidelines to default guidelines", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "dynamic_tool"],
				promptGuidelines: ["Use dynamic_tool for project summaries."],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).toContain("- Use dynamic_tool for project summaries.");
		});

		test("deduplicates and trims promptGuidelines", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "dynamic_tool"],
				promptGuidelines: ["Use dynamic_tool for summaries.", "  Use dynamic_tool for summaries.  ", "   "],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt.match(/- Use dynamic_tool for summaries\./g)).toHaveLength(1);
		});
	});

	describe("PI_ILO_DEFAULT (fork-specific)", () => {
		const originalDefault = process.env.PI_ILO_DEFAULT;
		const originalExtra = process.env.PI_ILO_SYSTEM_PROMPT;

		beforeEach(() => {
			delete process.env.PI_ILO_DEFAULT;
			delete process.env.PI_ILO_SYSTEM_PROMPT;
			resetIloDefaultCache();
		});

		afterEach(() => {
			if (originalDefault === undefined) delete process.env.PI_ILO_DEFAULT;
			else process.env.PI_ILO_DEFAULT = originalDefault;
			if (originalExtra === undefined) delete process.env.PI_ILO_SYSTEM_PROMPT;
			else process.env.PI_ILO_SYSTEM_PROMPT = originalExtra;
			resetIloDefaultCache();
		});

		test("does not inject ilo block when env var is unset", () => {
			const prompt = buildSystemPrompt({
				selectedTools: [],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).not.toContain("ilo-first mode");
			expect(prompt.startsWith("You are an expert coding assistant")).toBe(true);
		});

		test("prepends ilo-first block when PI_ILO_DEFAULT=1", () => {
			process.env.PI_ILO_DEFAULT = "1";
			resetIloDefaultCache();

			const prompt = buildSystemPrompt({
				selectedTools: [],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt.startsWith("# ilo-first mode")).toBe(true);
			expect(prompt).toContain("prefer ilo");
			expect(prompt).toContain("You are an expert coding assistant");
		});

		test("prepends ilo-first block to a customPrompt as well", () => {
			process.env.PI_ILO_DEFAULT = "true";
			resetIloDefaultCache();

			const prompt = buildSystemPrompt({
				customPrompt: "Custom system prompt body.",
				selectedTools: [],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt.startsWith("# ilo-first mode")).toBe(true);
			expect(prompt).toContain("Custom system prompt body.");
		});

		test("appends PI_ILO_SYSTEM_PROMPT when provided", () => {
			process.env.PI_ILO_DEFAULT = "yes";
			process.env.PI_ILO_SYSTEM_PROMPT = "Always emit a top-level comment with the ilo version.";
			resetIloDefaultCache();

			const prompt = buildSystemPrompt({
				selectedTools: [],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).toContain("# ilo-first mode");
			expect(prompt).toContain("Always emit a top-level comment with the ilo version.");
		});

		test("treats falsy values as disabled", () => {
			process.env.PI_ILO_DEFAULT = "0";
			resetIloDefaultCache();

			const prompt = buildSystemPrompt({
				selectedTools: [],
				contextFiles: [],
				skills: [],
				cwd: process.cwd(),
			});

			expect(prompt).not.toContain("ilo-first mode");
		});
	});
});
