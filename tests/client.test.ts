import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegonClient } from "../src/client.js";
import { RegonNotFoundError, RegonValidationError } from "../src/errors.js";
import { ServiceParam } from "../src/reports.js";

const mockLogin = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <ZalogujResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <ZalogujResult>abc-session-123</ZalogujResult>
    </ZalogujResponse>
  </s:Body>
</s:Envelope>`;

const mockLogout = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <WylogujResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <WylogujResult>true</WylogujResult>
    </WylogujResponse>
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

const mockGetValueResult = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <GetValueResponse xmlns="http://CIS/BIR/PUBL/2014/07">
      <GetValueResult>1</GetValueResult>
    </GetValueResponse>
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
      expect(await client.searchByNip("5260250216")).toEqual([]);
    });

    it("throws RegonValidationError for invalid NIP", async () => {
      await expect(client.searchByNip("1234567890")).rejects.toThrow(RegonValidationError);
    });
  });

  describe("searchByNips", () => {
    it("returns results for multiple valid NIPs", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockSearchResult));
      const results = await client.searchByNips(["5260250216"]);
      expect(results).toHaveLength(1);
    });

    it("throws if more than 20 NIPs provided", async () => {
      const nips: string[] = Array(21).fill("5260250216") as string[];
      await expect(client.searchByNips(nips)).rejects.toThrow(/max 20/);
    });

    it("returns empty array for empty input", async () => {
      expect(await client.searchByNips([])).toEqual([]);
    });
  });

  describe("searchByRegon", () => {
    it("searches by 9-digit REGON", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockSearchResult));
      const results = await client.searchByRegon("142396858");
      expect(results).toHaveLength(1);
    });

    it("searches by 14-digit REGON", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockSearchResult));
      const results = await client.searchByRegon("14239685800002");
      expect(results).toHaveLength(1);
    });

    it("throws RegonValidationError for invalid REGON", async () => {
      await expect(client.searchByRegon("123456789")).rejects.toThrow(RegonValidationError);
    });
  });

  describe("searchByKrs", () => {
    it("searches by KRS number", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockSearchResult));
      const results = await client.searchByKrs("0000000001");
      expect(results).toHaveLength(1);
    });
  });

  describe("getCompanyByNip", () => {
    it("returns merged entity + report data", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockSearchResult, mockReportResult));
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

  describe("getValue", () => {
    it("returns service parameter value", async () => {
      vi.stubGlobal("fetch", makeFetchMock(mockLogin, mockGetValueResult));
      const value = await client.getValue(ServiceParam.SERVICE_STATUS);
      expect(value).toBe("1");
    });
  });

  describe("manual session management", () => {
    it("login() establishes session", async () => {
      const fetchMock = makeFetchMock(mockLogin);
      vi.stubGlobal("fetch", fetchMock);
      await client.login();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("logout() closes session after login", async () => {
      const fetchMock = makeFetchMock(mockLogin, mockLogout);
      vi.stubGlobal("fetch", fetchMock);
      await client.login();
      await client.logout();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
