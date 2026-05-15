// XML response parser for BIR1.1 SOAP responses

import { XMLParser } from "fast-xml-parser";
import type { EntitySummary, EntityType, SilosId } from "./types.js";
import { RegonApiError, RegonNotFoundError } from "./errors.js";

const xmlParser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });

export function extractResult<T>(soapXml: string, resultTag: string): T {
  const parsed = xmlParser.parse(soapXml) as Record<string, unknown>;
  const body = getNestedValue(parsed, ["Envelope", "Body"]) as Record<string, unknown> | undefined;
  if (!body) throw new RegonApiError("Malformed SOAP response: missing Body");

  const fault = getNestedValue(body, ["Fault"]);
  if (fault) {
    const reason = getNestedValue(fault as Record<string, unknown>, ["Reason", "Text"]);
    throw new RegonApiError(`SOAP fault: ${String(reason ?? fault)}`);
  }

  const result = findKey(body, resultTag);
  if (result === undefined) throw new RegonApiError(`Missing ${resultTag} in response`);
  return result as T;
}

export function parseEntityList(xml: string): EntitySummary[] {
  if (!xml || xml.trim() === "") return [];

  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const root = getNestedValue(parsed, ["root"]) as Record<string, unknown> | undefined;
  if (!root) return [];

  const data = root["dane"];
  if (!data) return [];

  const rows = Array.isArray(data) ? data : [data];
  return rows.map(mapEntityRow);
}

function mapEntityRow(row: unknown): EntitySummary {
  const r = row as Record<string, unknown>;
  return {
    regon: String(r["Regon"] ?? ""),
    nip: String(r["Nip"] ?? ""),
    statusNip: String(r["StatusNip"] ?? ""),
    name: String(r["Nazwa"] ?? ""),
    voivodeship: String(r["Wojewodztwo"] ?? ""),
    county: String(r["Powiat"] ?? ""),
    commune: String(r["Gmina"] ?? ""),
    city: String(r["Miejscowosc"] ?? ""),
    postalCode: String(r["KodPocztowy"] ?? ""),
    street: String(r["Ulica"] ?? ""),
    buildingNumber: String(r["NrNieruchomosci"] ?? ""),
    apartmentNumber: String(r["NrLokalu"] ?? ""),
    type: String(r["Typ"] ?? "P") as EntityType,
    silosId: Number(r["SilosID"] ?? 6) as SilosId,
  };
}

export function parseReport(xml: string): Record<string, string> {
  if (!xml || xml.trim() === "") throw new RegonNotFoundError("Empty report response");

  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const root = getNestedValue(parsed, ["root", "dane"]) as Record<string, unknown> | undefined;
  if (!root) throw new RegonNotFoundError("Report not found");

  return Object.fromEntries(
    Object.entries(root).map(([k, v]) => [k, String(v ?? "")])
  );
}

function getNestedValue(obj: Record<string, unknown>, keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = Object.entries(current as Record<string, unknown>).find(
      ([k]) => k.toLowerCase().endsWith(key.toLowerCase())
    )?.[1];
  }
  return current;
}

function findKey(obj: Record<string, unknown>, suffix: string): unknown {
  const entry = Object.entries(obj).find(([k]) =>
    k.toLowerCase().includes(suffix.toLowerCase())
  );
  if (!entry) {
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") {
        const nested = findKey(v as Record<string, unknown>, suffix);
        if (nested !== undefined) return nested;
      }
    }
    return undefined;
  }
  return entry[1];
}
