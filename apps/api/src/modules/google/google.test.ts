import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({ prisma: {} }));

const { parseMeetCode } = await import("./google.service.js");
const { decrypt, encrypt } = await import("../../lib/crypto.js");

describe("parseMeetCode", () => {
	it("extrai o código da reunião do link do Meet", () => {
		expect(parseMeetCode("https://meet.google.com/abc-defg-hij")).toBe("abc-defg-hij");
		expect(parseMeetCode("https://meet.google.com/ABC-DEFG-HIJ?authuser=0")).toBe("abc-defg-hij");
		expect(parseMeetCode("https://zoom.us/j/123")).toBeNull();
		expect(parseMeetCode(null)).toBeNull();
	});
});

describe("criptografia dos tokens", () => {
	it("criptografa e descriptografa", () => {
		const secret = "ya29.token-de-teste";
		const encrypted = encrypt(secret);
		expect(encrypted).not.toContain(secret);
		expect(decrypt(encrypted)).toBe(secret);
	});
});
