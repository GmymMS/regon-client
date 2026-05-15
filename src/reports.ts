import type { SilosId } from "./types.js";

export const ReportType = {
  LEGAL_ENTITY: "BIR11OsPrawna",
  LEGAL_ENTITY_PKD: "BIR11OsPrawnaPkd",
  CIVIL_PARTNERSHIP: "BIR11OsFizycznaSpCywilna",
  NATURAL_PERSON_CEIDG: "BIR11OsFizycznaDzialalnoscCeidg",
  NATURAL_PERSON_AGRICULTURAL: "BIR11OsFizycznaDzialalnoscRolnicza",
  NATURAL_PERSON_OTHER: "BIR11OsFizycznaDzialalnoscPozostala",
  NATURAL_PERSON_PKD: "BIR11OsFizycznaAdresPkd",
  LOCAL_UNIT_NATURAL: "BIR11JednLokalnaOsFizycznej",
  LOCAL_UNIT_LEGAL: "BIR11JednLokalnaOsPrawna",
} as const;

export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const ServiceParam = {
  SERVICE_STATUS: "StatusSerwisu",
  LAST_UPDATE_DATE: "DataZaladowaniaDanych",
  MESSAGES: "KomunikatyDBIR",
} as const;

export type ServiceParam = (typeof ServiceParam)[keyof typeof ServiceParam];

export const SILOS_TO_REPORT: Record<SilosId, ReportType> = {
  1: ReportType.CIVIL_PARTNERSHIP,
  2: ReportType.NATURAL_PERSON_CEIDG,
  3: ReportType.NATURAL_PERSON_AGRICULTURAL,
  4: ReportType.NATURAL_PERSON_OTHER,
  6: ReportType.LEGAL_ENTITY,
  7: ReportType.LOCAL_UNIT_NATURAL,
  8: ReportType.LOCAL_UNIT_LEGAL,
};
