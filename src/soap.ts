// SOAP envelope builder and HTTP transport for BIR1.1

const BIR_NS = "http://CIS/BIR/PUBL/2014/07";
const SOAP_NS = "http://www.w3.org/2003/05/soap-envelope";

export function buildEnvelope(body: string, sessionId?: string): string {
  const header = sessionId
    ? `<soap:Header><ns:sid xmlns:ns="${BIR_NS}">${sessionId}</ns:sid></soap:Header>`
    : "<soap:Header/>";
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="${SOAP_NS}" xmlns:ns="${BIR_NS}">` +
    header +
    `<soap:Body>${body}</soap:Body>` +
    `</soap:Envelope>`
  );
}

export async function callSoap(
  url: string,
  action: string,
  body: string,
  sessionId: string | undefined,
  timeoutMs: number
): Promise<string> {
  const envelope = buildEnvelope(body, sessionId);
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml;charset=UTF-8",
        SOAPAction: action,
      },
      body: envelope,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}
