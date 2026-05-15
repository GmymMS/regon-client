import { describe, it, expect, vi } from "vitest";
import { buildEnvelope, callSoap } from "../src/soap.js";

describe("buildEnvelope", () => {
  it("builds envelope without session header", () => {
    const env = buildEnvelope("<ns:Zaloguj/>");
    expect(env).toContain("<soap:Header/>");
    expect(env).toContain("<ns:Zaloguj/>");
    expect(env).toContain("soap-envelope");
  });

  it("builds envelope with session header", () => {
    const env = buildEnvelope("<ns:GetValue/>", "test-session-id");
    expect(env).toContain("<ns:sid");
    expect(env).toContain("test-session-id");
    expect(env).not.toContain("<soap:Header/>");
  });

  it("is valid XML structure", () => {
    const env = buildEnvelope("<ns:body/>", "sid-123");
    expect(env).toMatch(/^<\?xml version="1\.0"/);
    expect(env).toContain("<soap:Envelope");
    expect(env).toContain("</soap:Envelope>");
    expect(env).toContain("<soap:Body>");
    expect(env).toContain("</soap:Body>");
  });
});

describe("callSoap", () => {
  it("throws on non-2xx HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: () => Promise.resolve(""),
    }));
    await expect(
      callSoap("https://test.pl", "action", "<body/>", undefined, 5_000)
    ).rejects.toThrow("HTTP 503");
  });

  it("resolves with response text on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<response/>"),
    }));
    const result = await callSoap("https://test.pl", "action", "<body/>", "sid", 5_000);
    expect(result).toBe("<response/>");
  });
});
