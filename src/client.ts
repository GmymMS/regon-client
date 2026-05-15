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
// ParametryWyszukiwania fields are in the DataContract namespace per GUS BIR WSDL
const DC_NS = "http://CIS/BIR/PUBL/2014/07/DataContract";

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
    return this.search(`<dc:Nip xmlns:dc="${DC_NS}">${clean}</dc:Nip>`);
  }

  async searchByNips(nips: string[]): Promise<EntitySummary[]> {
    if (nips.length === 0) return [];
    if (nips.length > 20) throw new Error("searchByNips: max 20 NIPs per call");
    const cleaned = nips.map((n) => validateNip(n));
    return this.search(`<dc:Nipy xmlns:dc="${DC_NS}">${cleaned.join(",")}</dc:Nipy>`);
  }

  async searchByRegon(regon: string): Promise<EntitySummary[]> {
    const clean = validateRegon(regon);
    const tag = clean.length === 9 ? "Regony9zn" : "Regony14zn";
    return this.search(`<dc:${tag} xmlns:dc="${DC_NS}">${clean}</dc:${tag}>`);
  }

  async searchByKrs(krs: string): Promise<EntitySummary[]> {
    return this.search(`<dc:Krs xmlns:dc="${DC_NS}">${krs}</dc:Krs>`);
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
      const result = extractResult(xml, "DanePobierzPelnyRaportResult") as string;
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
      return String(extractResult(xml, "GetValueResult"));
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
        `<ns:pParametryWyszukiwania>` +
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
      const result = extractResult(xml, "DaneSzukajPodmiotyResult") as string;
      return parseEntityList(result);
    });
  }
}
