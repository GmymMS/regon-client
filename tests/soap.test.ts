import { describe, it, expect } from "vitest";
import { buildEnvelope } from "../src/soap.js";

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
