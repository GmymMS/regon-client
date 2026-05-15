import { describe, it, expect } from "vitest";
import { parseEntityList, parseReport, extractResult } from "../src/parser.js";
import { RegonApiError, RegonNotFoundError } from "../src/errors.js";

const SEARCH_SOAP_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <DaneSzukajPodmiotyResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <DaneSzukajPodmiotyResult><![CDATA[<?xml version="1.0" encoding="utf-8"?>
<root><dane>
  <Regon>142396858</Regon>
  <Nip>5260250216</Nip>
  <StatusNip/>
  <Nazwa>PRZYKŁADOWA SPÓŁKA Z O.O.</Nazwa>
  <Wojewodztwo>MAZOWIECKIE</Wojewodztwo>
  <Powiat>Warszawa</Powiat>
  <Gmina>Warszawa-Śródmieście</Gmina>
  <Miejscowosc>Warszawa</Miejscowosc>
  <KodPocztowy>00-001</KodPocztowy>
  <Ulica>ul. Testowa</Ulica>
  <NrNieruchomosci>1</NrNieruchomosci>
  <NrLokalu>2</NrLokalu>
  <Typ>P</Typ>
  <SilosID>6</SilosID>
</dane></root>]]></DaneSzukajPodmiotyResult>
    </DaneSzukajPodmiotyResponse>
  </s:Body>
</s:Envelope>`;

const FAULT_SOAP_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <s:Fault>
      <s:Code><s:Value>s:Receiver</s:Value></s:Code>
      <s:Reason><s:Text xml:lang="">Sesja wygasła</s:Text></s:Reason>
    </s:Fault>
  </s:Body>
</s:Envelope>`;

describe("extractResult", () => {
  it("extracts result value from SOAP response", () => {
    const result = extractResult<string>(SEARCH_SOAP_RESPONSE, "DaneSzukajPodmiotyResult");
    expect(result).toContain("142396858");
  });

  it("throws RegonApiError on SOAP fault", () => {
    expect(() => extractResult(FAULT_SOAP_RESPONSE, "anything")).toThrow(RegonApiError);
    expect(() => extractResult(FAULT_SOAP_RESPONSE, "anything")).toThrow(/Sesja wygasła/);
  });

  it("throws RegonApiError on malformed response", () => {
    expect(() => extractResult("<not-soap/>", "Result")).toThrow(RegonApiError);
  });
});

describe("parseEntityList", () => {
  it("parses entity list from search result XML", () => {
    const inner = extractResult<string>(SEARCH_SOAP_RESPONSE, "DaneSzukajPodmiotyResult");
    const entities = parseEntityList(inner);
    expect(entities).toHaveLength(1);
    const [e] = entities;
    expect(e?.regon).toBe("142396858");
    expect(e?.nip).toBe("5260250216");
    expect(e?.name).toBe("PRZYKŁADOWA SPÓŁKA Z O.O.");
    expect(e?.type).toBe("P");
    expect(e?.silosId).toBe(6);
    expect(e?.city).toBe("Warszawa");
  });

  it("returns empty array for empty string", () => {
    expect(parseEntityList("")).toEqual([]);
  });

  it("returns empty array for XML with no results", () => {
    expect(parseEntityList("<?xml version='1.0'?><root/>")).toEqual([]);
  });
});

describe("parseReport", () => {
  it("parses report XML into key-value record", () => {
    const xml = `<?xml version="1.0"?><root><dane>
      <praw_regon9>142396858</praw_regon9>
      <praw_nazwa>TEST SP Z OO</praw_nazwa>
    </dane></root>`;
    const report = parseReport(xml);
    expect(report["praw_regon9"]).toBe("142396858");
    expect(report["praw_nazwa"]).toBe("TEST SP Z OO");
  });

  it("throws RegonNotFoundError for empty response", () => {
    expect(() => parseReport("")).toThrow(RegonNotFoundError);
  });

  it("throws RegonNotFoundError when root.dane missing", () => {
    expect(() => parseReport("<?xml version='1.0'?><root/>")).toThrow(RegonNotFoundError);
  });
});
