import { describe, it, expect, vi, beforeEach } from "vitest";
import { Session } from "../src/session.js";
import { RegonAuthError, RegonSessionError } from "../src/errors.js";

const mockLoginOk = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <ZalogujResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <ZalogujResult>test-sid-abc</ZalogujResult>
    </ZalogujResponse>
  </s:Body>
</s:Envelope>`;

const mockLoginNull = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <ZalogujResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <ZalogujResult>00000000-0000-0000-0000-000000000000</ZalogujResult>
    </ZalogujResponse>
  </s:Body>
</s:Envelope>`;

const mockLogoutOk = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <WylogujResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <WylogujResult>true</WylogujResult>
    </WylogujResponse>
  </s:Body>
</s:Envelope>`;

function makeFetchMock(...responses: string[]) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const body = responses[call++ % responses.length] ?? "";
    return Promise.resolve({ ok: true, text: () => Promise.resolve(body) });
  });
}

describe("Session", () => {
  let session: Session;

  beforeEach(() => {
    session = new Session("https://test.endpoint.pl", "test-key", 5_000);
  });

  it("performs lazy login on first get()", async () => {
    vi.stubGlobal("fetch", makeFetchMock(mockLoginOk));
    expect(await session.get()).toBe("test-sid-abc");
  });

  it("reuses session on subsequent get() calls", async () => {
    const fetchMock = makeFetchMock(mockLoginOk);
    vi.stubGlobal("fetch", fetchMock);
    await session.get();
    await session.get();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent login requests", async () => {
    const fetchMock = makeFetchMock(mockLoginOk);
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([session.get(), session.get()]);
    expect(a).toBe("test-sid-abc");
    expect(b).toBe("test-sid-abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws RegonAuthError when API key is invalid", async () => {
    vi.stubGlobal("fetch", makeFetchMock(mockLoginNull));
    await expect(session.get()).rejects.toThrow(RegonAuthError);
  });

  it("close() is a no-op when no session is active", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await session.close();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("close() calls logout when session is active", async () => {
    const fetchMock = makeFetchMock(mockLoginOk, mockLogoutOk);
    vi.stubGlobal("fetch", fetchMock);
    await session.get();
    await session.close();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidate() clears session so next get() re-logins", async () => {
    const fetchMock = makeFetchMock(mockLoginOk, mockLoginOk);
    vi.stubGlobal("fetch", fetchMock);
    await session.get();
    session.invalidate();
    await session.get();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("withSession() retries once on RegonSessionError", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", makeFetchMock(mockLoginOk, mockLoginOk));
    const result = await session.withSession(() => {
      calls++;
      if (calls === 1) throw new RegonSessionError("Session expired");
      return Promise.resolve("success");
    });
    expect(result).toBe("success");
    expect(calls).toBe(2);
  });

  it("withSession() rethrows non-session errors without retry", async () => {
    vi.stubGlobal("fetch", makeFetchMock(mockLoginOk));
    await expect(
      session.withSession(() => {
        throw new Error("unrelated error");
      })
    ).rejects.toThrow("unrelated error");
  });
});
