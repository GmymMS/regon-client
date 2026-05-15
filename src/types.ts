export interface RegonClientConfig {
  apiKey: string;
  env?: "production" | "test";
  timeout?: number;
}

export type EntityType = "F" | "P" | "LF" | "LP";
export type SilosId = 1 | 2 | 3 | 4 | 6 | 7 | 8;

export interface EntitySummary {
  regon: string;
  nip: string;
  statusNip: string;
  name: string;
  voivodeship: string;
  county: string;
  commune: string;
  city: string;
  postalCode: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
  type: EntityType;
  silosId: SilosId;
}

export interface CompanyData extends EntitySummary {
  report: Record<string, string>;
  reportType: string;
}
