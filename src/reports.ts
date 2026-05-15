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

// GUS BIR1.1 silosId codes: 1=CEIDG, 2=Agricultural, 3=Other, 4=CivilPartnership, 6=LegalEntity, 7=LocalNatural, 8=LocalLegal
export const SILOS_TO_REPORT: Record<SilosId, ReportType> = {
  1: ReportType.NATURAL_PERSON_CEIDG,
  2: ReportType.NATURAL_PERSON_AGRICULTURAL,
  3: ReportType.NATURAL_PERSON_OTHER,
  4: ReportType.CIVIL_PARTNERSHIP,
  6: ReportType.LEGAL_ENTITY,
  7: ReportType.LOCAL_UNIT_NATURAL,
  8: ReportType.LOCAL_UNIT_LEGAL,
};
