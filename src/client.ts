import { Session } from "./session.js";
import { callSoap } from "./soap.js";
import { extractResult, parseEntityList, parseReport } from "./parser.js";
import { validateNip, validateRegon } from "./validator.js";
import { SILOS_TO_REPORT, type ReportType, type ServiceParam } from "./reports.js";
import { RegonNotFoundError } from "./errors.js";
import type { RegonClientConfig, EntitySummary, CompanyData } from "./types.js";

const ENDPOINTS = {
  production: "https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc",
  test: "https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc",
} as const;

const BIR_ACTION_BASE = "http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl";

export class RegonClient {
  private readonly url: string;
  private readonly session: Session;
  private readonly timeoutMs: number;

  constructor(config: RegonClientConfig) {
    const env = config.env ?? "production";
    this.url = ENDPOINTS[env];
    this.timeoutMs = config.timeout ?? 30_000;
    this.session = new Session(this.url, config.apiKey, this.timeoutMs);
  }

  async searchByNip(nip: string): Promise<EntitySummary[]> {
    const clean = validateNip(nip);
    return this.search(`<ns:Nip>${clean}</ns:Nip>`);
  }

  async searchByNips(nips: string[]): Promise<EntitySummary[]> {
    if (nips.length === 0) return [];
    if (nips.length > 20) throw new Error("searchByNips: max 20 NIPs per call");
    const cleaned = nips.map((n) => validateNip(n));
    return this.search(`<ns:Nipy>${cleaned.join(",")}</ns:Nipy>`);
  }

  async searchByRegon(regon: string): Promise<EntitySummary[]> {
    const clean = validateRegon(regon);
    const tag = clean.length === 9 ? "ns:Regony9zn" : "ns:Regony14zn";
    return this.search(`<${tag}>${clean}</${tag}>`);
  }

  async searchByKrs(krs: string): Promise<EntitySummary[]> {
    return this.search(`<ns:Krs>${krs}</ns:Krs>`);
  }

  async getFullReport(regon: string, reportType: ReportType): Promise<Record<string, string>> {
    return this.session.withSession(async (sid) => {
      const body =
        `<ns:DanePobierzPelnyRaport>` +
        `<ns:pRegon>${regon}</ns:pRegon>` +
        `<ns:pNazwaRaportu>${reportType}</ns:pNazwaRaportu>` +
        `</ns:DanePobierzPelnyRaport>`;
      const xml = await callSoap(
        this.url,
        `${BIR_ACTION_BASE}/DanePobierzPelnyRaport`,
        body,
        sid,
        this.timeoutMs
      );
      const result = extractResult<string>(xml, "DanePobierzPelnyRaportResult");
      return parseReport(result);
    });
  }

  async getCompanyByNip(nip: string): Promise<CompanyData> {
    const [entity] = await this.searchByNip(nip);
    if (!entity) throw new RegonNotFoundError(`No entity found for NIP: ${nip}`);
    const reportType = SILOS_TO_REPORT[entity.silosId];
    const report = await this.getFullReport(entity.regon, reportType);
    return { ...entity, report, reportType };
  }

  async getValue(param: ServiceParam): Promise<string> {
    return this.session.withSession(async (sid) => {
      const body =
        `<ns:GetValue><ns:pNazwaParametru>${param}</ns:pNazwaParametru></ns:GetValue>`;
      const xml = await callSoap(
        this.url,
        `${BIR_ACTION_BASE}/GetValue`,
        body,
        sid,
        this.timeoutMs
      );
      return extractResult<string>(xml, "GetValueResult");
    });
  }

  async login(): Promise<void> {
    await this.session.get();
  }

  async logout(): Promise<void> {
    await this.session.close();
  }

  private async search(paramXml: string): Promise<EntitySummary[]> {
    return this.session.withSession(async (sid) => {
      const body =
        `<ns:DaneSzukajPodmioty>` +
        `<ns:pParametryWyszukiwania xmlns:ns1="http://CIS/BIR/PUBL/2014/07">` +
        paramXml +
        `</ns:pParametryWyszukiwania>` +
        `</ns:DaneSzukajPodmioty>`;
      const xml = await callSoap(
        this.url,
        `${BIR_ACTION_BASE}/DaneSzukajPodmioty`,
        body,
        sid,
        this.timeoutMs
      );
      const result = extractResult<string>(xml, "DaneSzukajPodmiotyResult");
      return parseEntityList(result);
    });
  }
}
