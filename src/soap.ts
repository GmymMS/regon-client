// SOAP envelope builder and HTTP transport for BIR1.1

const BIR_NS = "http://CIS/BIR/PUBL/2014/07";
const SOAP_NS = "http://www.w3.org/2003/05/soap-envelope";
const WS_ADDR_NS = "http://www.w3.org/2005/08/addressing";

export function buildEnvelope(body: string, action: string, url: string): string {
  // GUS WCF endpoint requires WS-Addressing headers (a:Action + a:To) in every request
  const headerContent =
    `<a:Action xmlns:a="${WS_ADDR_NS}" soap:mustUnderstand="1">${action}</a:Action>` +
    `<a:To xmlns:a="${WS_ADDR_NS}" soap:mustUnderstand="1">${url}</a:To>`;
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="${SOAP_NS}" xmlns:ns="${BIR_NS}">` +
    `<soap:Header>${headerContent}</soap:Header>` +
    `<soap:Body>${body}</soap:Body>` +
    `</soap:Envelope>`
  );
}

// GUS returns MTOM multipart responses — extract the embedded SOAP XML
function extractSoapXml(text: string): string {
  if (!text.trimStart().startsWith("--")) return text;
  // Match <Envelope> or <prefix:Envelope> without accidentally matching URLs like <http://...>
  const match = text.match(/<(?:[a-zA-Z][a-zA-Z0-9]*:)?Envelope[\s\S]*<\/(?:[a-zA-Z][a-zA-Z0-9]*:)?Envelope>/);
  return match ? match[0] : text;
}

export async function callSoap(
  url: string,
  action: string,
  body: string,
  sessionId: string | undefined,
  timeoutMs: number
): Promise<string> {
  const envelope = buildEnvelope(body, action, url);
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/soap+xml;charset=UTF-8",
    SOAPAction: action,
  };
  // GUS BIR session token is passed as HTTP header, not in the SOAP envelope
  if (sessionId) {
    headers["sid"] = sessionId;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: envelope,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error("HTTP " + String(res.status) + ": " + res.statusText);
    }
    return extractSoapXml(text);
  } finally {
    clearTimeout(timer);
  }
}
