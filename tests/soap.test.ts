import { describe, it, expect, vi } from "vitest";
import { buildEnvelope, callSoap } from "../src/soap.js";

const ACTION = "http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj";
const URL = "https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc";

describe("buildEnvelope", () => {
  it("includes WS-Addressing Action and To headers", () => {
    const env = buildEnvelope("<ns:Zaloguj/>", ACTION, URL);
    expect(env).toContain("http://www.w3.org/2005/08/addressing");
    expect(env).toContain(ACTION);
    expect(env).toContain(URL);
    expect(env).toContain("<ns:Zaloguj/>");
    expect(env).toContain("soap-envelope");
  });

  it("does not include session id in SOAP envelope (sid goes in HTTP header)", () => {
    const env = buildEnvelope("<ns:GetValue/>", ACTION, URL);
    expect(env).not.toContain("sid");
  });

  it("is valid XML structure", () => {
    const env = buildEnvelope("<ns:body/>", ACTION, URL);
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
      callSoap("https://test.pl", ACTION, "<body/>", undefined, 5_000)
    ).rejects.toThrow("HTTP 503");
  });

  it("passes sid as HTTP header when session provided", async () => {
    let capturedHeaders: Record<string, string> = {};
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedHeaders = init.headers as Record<string, string>;
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve("<s:Envelope><s:Body><Result>ok</Result></s:Body></s:Envelope>"),
      });
    }));
    await callSoap("https://test.pl", ACTION, "<body/>", "my-session-id", 5_000);
    expect(capturedHeaders["sid"]).toBe("my-session-id");
  });

  it("resolves with plain XML response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<s:Envelope><s:Body><Result>ok</Result></s:Body></s:Envelope>"),
    }));
    const result = await callSoap("https://test.pl", ACTION, "<body/>", "sid", 5_000);
    expect(result).toContain("<Result>ok</Result>");
  });

  it("strips MTOM multipart wrapper and returns inner XML", async () => {
    const mtomBody = [
      "--uuid:test-boundary",
      'Content-Type: application/xop+xml;charset=utf-8;type="application/soap+xml"',
      "",
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><Result>ok</Result></s:Body></s:Envelope>',
      "--uuid:test-boundary--",
    ].join("\n");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mtomBody),
    }));
    const result = await callSoap("https://test.pl", ACTION, "<body/>", "sid", 5_000);
    expect(result).toContain("<Result>ok</Result>");
    expect(result).not.toContain("uuid:test-boundary");
  });
});
