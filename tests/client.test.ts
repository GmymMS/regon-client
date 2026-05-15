import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegonClient } from "../src/client.js";
import { RegonNotFoundError, RegonValidationError } from "../src/errors.js";

const mockLogin = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <ZalogujResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <ZalogujResult>abc-session-123</ZalogujResult>
    </ZalogujResponse>
  </s:Body>
</s:Envelope>`;

const mockSearchResult = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <DaneSzukajPodmiotyResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <DaneSzukajPodmiotyResult><![CDATA[<?xml version="1.0"?><root><dane>
        <Regon>142396858</Regon><Nip>5260250216</Nip><StatusNip/>
        <Nazwa>TEST SP Z OO</Nazwa><Wojewodztwo>MAZOWIECKIE</Wojewodztwo>
        <Powiat>Warszawa</Powiat><Gmina>Śródmieście</Gmina>
        <Miejscowosc>Warszawa</Miejscowosc><KodPocztowy>00-001</KodPocztowy>
        <Ulica>ul. Testowa</Ulica><NrNieruchomosci>1</NrNieruchomosci>
        <NrLokalu/><Typ>P</Typ><SilosID>6</SilosID>
      </dane></root>]]></DaneSzukajPodmiotyResult>
    </DaneSzukajPodmiotyResponse>
  </s:Body>
</s:Envelope>`;

const mockEmptySearch = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <DaneSzukajPodmiotyResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <DaneSzukajPodmiotyResult></DaneSzukajPodmiotyResult>
    </DaneSzukajPodmiotyResponse>
  </s:Body>
</s:Envelope>`;

const mockReportResult = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <DanePobierzPelnyRaportResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <DanePobierzPelnyRaportResult><![CDATA[<?xml version="1.0"?><root><dane>
        <praw_regon9>142396858</praw_regon9>
        <praw_nazwa>TEST SP Z OO</praw_nazwa>
        <praw_nip>5260250216</praw_nip>
      </dane></root>]]></DanePobierzPelnyRaportResult>
    </DanePobierzPelnyRaportResponse>
  </s:Body>
</s:Envelope>`;

function makeFetchMock(...responses: string[]) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const body = responses[call++ % responses.length] ?? "";
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(body),
    });
  });
}

describe("RegonClient", () => {
  let client: RegonClient;

  beforeEach(() => {
    client = new RegonClient({ apiKey: "abcde12345abcde12345", env: "test" });
  });

  describe("searchByNip", () => {
    it("returns entities for valid NIP", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockSearchResult));

      const results = await client.searchByNip("5260250216");
      expect(results).toHaveLength(1);
      expect(results[0]?.nip).toBe("5260250216");
      expect(results[0]?.regon).toBe("142396858");
      expect(results[0]?.name).toBe("TEST SP Z OO");
    });

    it("returns empty array when entity not found", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockEmptySearch));

      const results = await client.searchByNip("5260250216");
      expect(results).toEqual([]);
    });

    it("throws RegonValidationError for invalid NIP", async () => {
      await expect(client.searchByNip("1234567890")).rejects.toThrow(RegonValidationError);
    });
  });

  describe("searchByNips", () => {
    it("throws if more than 20 NIPs provided", async () => {
      const nips = Array(21).fill("5260250216");
      await expect(client.searchByNips(nips)).rejects.toThrow(/max 20/);
    });

    it("returns empty array for empty input", async () => {
      const results = await client.searchByNips([]);
      expect(results).toEqual([]);
    });
  });

  describe("getCompanyByNip", () => {
    it("returns merged entity + report data", async () => {
      vi.stubGlobal(
        "fetch",
        makeFetchMock(mockLogin, mockSearchResult, mockReportResult)
      );

      const company = await client.getCompanyByNip("5260250216");
      expect(company.nip).toBe("5260250216");
      expect(company.report["praw_nazwa"]).toBe("TEST SP Z OO");
      expect(company.reportType).toBe("BIR11OsPrawna");
    });

    it("throws RegonNotFoundError when NIP not found", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockEmptySearch));

      await expect(client.getCompanyByNip("5260250216")).rejects.toThrow(RegonNotFoundError);
    });
  });
});
