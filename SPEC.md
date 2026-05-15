# `@gmymms/regon-client` — Specyfikacja techniczna

> Klient TypeScript dla usługi GUS BIR1.1 (REGON API) — wyszukiwanie danych podmiotów na podstawie NIP, REGON lub KRS.

---

## 1. Cel i zakres

Biblioteka server-side (Node.js ≥ 18) do odpytywania usługi BIR1.1 Głównego Urzędu Statystycznego.  
Nie działa w przeglądarce — usługa GUS blokuje CORS i wymaga SOAP over HTTPS.  
Docelowe środowiska: Next.js API routes, Server Actions, backend NestJS/Express.

---

## 2. Usługa BIR1.1 — podsumowanie

| | Produkcja | Test |
|---|---|---|
| Endpoint | `https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc` | `https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc` |
| WSDL | `…/wsdl/UslugaBIRzewnPubl-ver11-prod.wsdl` | `…/wsdl/UslugaBIRzewnPubl-ver11-test.wsdl` |
| Klucz testowy | — | `abcde12345abcde12345` |

### Limity
| Godziny | /h | /min | /s |
|---|---|---|---|
| 8:00–16:59 | 6 000 | 120 | 3 |
| 6:00–7:59, 17:00–21:59 | 8 000 | 150 | 3 |
| 22:00–5:59 | 10 000 | 200 | 4 |

### Dostępne operacje SOAP

| Operacja | Opis |
|---|---|
| `Zaloguj(pKluczUzytkownika)` | Tworzy sesję, zwraca `sessionId` |
| `Wyloguj(pIdentyfikatorSesji)` | Zamyka sesję |
| `GetValue(pNazwaParametru)` | Zwraca parametr usługi (np. status, data ostatniej aktualizacji) |
| `DaneSzukajPodmioty(pParametryWyszukiwania)` | Wyszukuje podmioty, zwraca XML z listą |
| `DanePobierzPelnyRaport(pRegon, pNazwaRaportu)` | Pobiera pełny raport dla podmiotu o danym REGON |
| `DanePobierzRaportZbiorczy(pDataRaportu, pNazwaRaportu)` | Raport zbiorczy za datę (nie używane w v1 biblioteki) |

### Parametry wyszukiwania (`ParametryWyszukiwania`)

```xml
<Nip>string</Nip>           <!-- pojedynczy NIP -->
<Nipy>string</Nipy>         <!-- lista NIP rozdzielona przecinkami, max 20 -->
<Regon>string</Regon>       <!-- 9 lub 14 cyfr -->
<Regony9zn>string</Regony9zn>
<Regony14zn>string</Regony14zn>
<Krs>string</Krs>
<Krsy>string</Krsy>
```

### Nagłówek SOAP sesji
Każde zapytanie (poza `Zaloguj`) wymaga nagłówka:
```xml
<soap:Header>
  <ns:sid>SESSION_ID</ns:sid>
</soap:Header>
```

---

## 3. Typy podmiotów i raporty

### Typ podmiotu (`EntityType`)
| Wartość | Znaczenie |
|---|---|
| `F` | Osoba fizyczna |
| `P` | Osoba prawna |
| `LF` | Jednostka lokalna osoby fizycznej |
| `LP` | Jednostka lokalna osoby prawnej |

### SilosID → ReportType (BIR1.1)

| SilosID | Typ podmiotu | Raport główny |
|---|---|---|
| 1 | Spółka cywilna | `BIR11OsFizycznaSpCywilna` |
| 2 | Os. fizyczna — CEIDG | `BIR11OsFizycznaDzialalnoscCeidg` |
| 3 | Os. fizyczna — działalność rolnicza | `BIR11OsFizycznaDzialalnoscRolnicza` |
| 4 | Os. fizyczna — bez rejestracji | `BIR11OsFizycznaDzialalnoscPozostala` |
| 6 | Osoba prawna | `BIR11OsPrawna` |
| 7 | Jednostka lokalna os. fizycznej | `BIR11JednLokalnaOsFizycznej` |
| 8 | Jednostka lokalna os. prawnej | `BIR11JednLokalnaOsPrawna` |

Raporty PKD (dodatkowe, dla każdego):
- `BIR11OsFizycznaAdresPkd`
- `BIR11OsPrawnaSpCywilnaWspolnicy`
- `BIR11OsPrawnaPkd`

---

## 4. Architektura biblioteki

```
src/
├── index.ts          ← publiczne exporty
├── client.ts         ← RegonClient — główna klasa
├── session.ts        ← zarządzanie sesją (login/logout, auto-renew)
├── soap.ts           ← budowanie koperty SOAP, wysyłanie HTTP
├── parser.ts         ← parsowanie XML odpowiedzi → TS objects
├── validator.ts      ← walidacja NIP, REGON (algorytm kontrolny)
├── reports.ts        ← enum ReportType + mapowanie SilosID → ReportType
├── errors.ts         ← hierarchia błędów
└── types.ts          ← wszystkie interfejsy/typy publiczne
tests/
├── client.test.ts
├── validator.test.ts
├── parser.test.ts
└── soap.test.ts
```

---

## 5. Publiczne API

### `RegonClient`

```typescript
const client = new RegonClient({
  apiKey: string,          // klucz użytkownika BIR
  env?: 'production' | 'test',  // default: 'production'
  timeout?: number,        // ms, default: 30_000
})
```

#### Metody

```typescript
// Wyszukiwanie podstawowe
searchByNip(nip: string): Promise<EntitySummary[]>
searchByNips(nips: string[]): Promise<EntitySummary[]>  // max 20
searchByRegon(regon: string): Promise<EntitySummary[]>
searchByKrs(krs: string): Promise<EntitySummary[]>

// Pełny raport (wymaga REGON z searchBy*)
getFullReport(regon: string, reportType: ReportType): Promise<Record<string, string>>

// Wygodna metoda: wyszukaj + pobierz główny raport w jednym kroku
getCompanyByNip(nip: string): Promise<CompanyData>

// Parametry usługi
getValue(param: ServiceParam): Promise<string>

// Ręczne zarządzanie sesją (opcjonalne; domyślnie auto)
login(): Promise<void>
logout(): Promise<void>
```

### Typy

```typescript
interface RegonClientConfig {
  apiKey: string
  env?: 'production' | 'test'
  timeout?: number
}

interface EntitySummary {
  regon: string
  nip: string
  statusNip: string
  name: string
  voivodeship: string
  county: string
  commune: string
  city: string
  postalCode: string
  street: string
  buildingNumber: string
  apartmentNumber: string
  type: EntityType
  silosId: SilosId
}

interface CompanyData extends EntitySummary {
  report: Record<string, string>
  reportType: ReportType
}

type EntityType = 'F' | 'P' | 'LF' | 'LP'
type SilosId = 1 | 2 | 3 | 4 | 6 | 7 | 8

enum ReportType {
  LEGAL_ENTITY                  = 'BIR11OsPrawna',
  NATURAL_PERSON_CEIDG          = 'BIR11OsFizycznaDzialalnoscCeidg',
  NATURAL_PERSON_AGRICULTURAL   = 'BIR11OsFizycznaDzialalnoscRolnicza',
  NATURAL_PERSON_OTHER          = 'BIR11OsFizycznaDzialalnoscPozostala',
  CIVIL_PARTNERSHIP             = 'BIR11OsFizycznaSpCywilna',
  LOCAL_UNIT_NATURAL            = 'BIR11JednLokalnaOsFizycznej',
  LOCAL_UNIT_LEGAL              = 'BIR11JednLokalnaOsPrawna',
  LEGAL_ENTITY_PKD              = 'BIR11OsPrawnaPkd',
  NATURAL_PERSON_PKD            = 'BIR11OsFizycznaAdresPkd',
}

enum ServiceParam {
  SERVICE_STATUS        = 'StatusSerwisu',
  LAST_UPDATE_DATE      = 'DataZaladowaniaDanych',
  MESSAGES              = 'KomunikatyDBIR',
}
```

---

## 6. Zarządzanie sesją

- Domyślnie: **auto-session** — `login()` wywoływane lazy przy pierwszym zapytaniu, `logout()` po każdej operacji wysokiego poziomu (`getCompanyByNip`).
- Zaawansowane: możliwa **sesja trwała** — wywołaj `login()` raz, wykonuj N zapytań, wywołaj `logout()` ręcznie. Użyteczne przy batch processing.
- Sesja wygasa po ~20 min bezczynności po stronie GUS — klient wykrywa błąd sesji i automatycznie odnawia (1 retry).

```
login()  →  sessionId stored in memory
   ↓
DaneSzukajPodmioty (header: sid=sessionId)
   ↓
DanePobierzPelnyRaport (header: sid=sessionId)
   ↓
logout()  →  sessionId cleared
```

---

## 7. Walidacja

### NIP
1. 10 cyfr (bez kresek)
2. Wagi: `[6, 5, 7, 2, 3, 4, 5, 6, 7]`
3. Suma = `Σ(cyfra[i] * waga[i])` mod 11 == cyfra[9]

### REGON (9-cyfrowy)
1. 9 cyfr
2. Wagi: `[8, 9, 2, 3, 4, 5, 6, 7]`
3. Suma mod 11 == cyfra[8] (jeśli 10 → 0)

### REGON (14-cyfrowy)
1. 14 cyfr
2. Pierwsze 9 cyfr przechodzi walidację 9-cyfrową
3. Wagi dla 14: `[2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8]`
4. Suma mod 11 == cyfra[13] (jeśli 10 → 0)

---

## 8. Błędy

```typescript
class RegonError extends Error {}                        // base
class RegonAuthError extends RegonError {}               // nieprawidłowy klucz API
class RegonSessionError extends RegonError {}            // sesja wygasła/nieważna
class RegonNotFoundError extends RegonError {}           // podmiot nie znaleziony
class RegonValidationError extends RegonError {          // zły format NIP/REGON
  field: 'nip' | 'regon' | 'krs'
}
class RegonRateLimitError extends RegonError {           // przekroczony limit
  retryAfterMs?: number
}
class RegonApiError extends RegonError {                 // inne błędy API
  code?: string
}
```

---

## 9. Stack techniczny

| Kategoria | Wybór | Uzasadnienie |
|---|---|---|
| Język | TypeScript 5.x | Strict mode, ESM |
| HTTP | `fetch` (native Node 18+) | Zero dependencies dla SOAP over HTTP |
| XML parsing | `fast-xml-parser` | Lekki, zero-dependency parser |
| Tests | Vitest | Szybki, natywny ESM, TypeScript out-of-the-box |
| Linting | ESLint 9 + `typescript-eslint` | Flat config |
| Build | `tsc` | Bez bundlera (czysta biblioteka) |
| Release | `npm version` + GitHub Actions | Automatyczny bump + tag |

**Celowe brak zależności produkcyjnych poza `fast-xml-parser`** — żadnych SOAP klientów (np. `node-soap`), ręcznie budowane koperty XML.

---

## 10. Struktura pakietu (exports)

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

Dual CJS/ESM build przez `tsup`.

---

## 11. CI/CD Pipelines

### `ci.yml` — Continuous Integration
**Trigger:** push + PR do `main`

| Krok | Narzędzie |
|---|---|
| Typecheck | `tsc --noEmit` |
| Lint | `eslint src tests` |
| Test | `vitest run --coverage` |
| Build | `tsup` |

### `release.yml` — Release on demand
**Trigger:** `workflow_dispatch`

**Inputs:**
- `version-type`: `patch` / `minor` / `major`
- `dry-run`: bool (default false)

**Kroki:**
1. Checkout z pełną historią git
2. Setup Node 20 + npm auth (NPM_TOKEN / GPR_TOKEN)
3. `npm ci`
4. `npm version <type> --no-git-tag-version`
5. Build + test (guard)
6. `git commit -m "chore: release vX.Y.Z"`
7. `git tag vX.Y.Z`
8. `git push --follow-tags`
9. Publish do GitHub Packages (`@gmymms/regon-client`)
10. GitHub Release z auto-generated changelog

### `security.yml` — Security Scanning
**Trigger:** push do `main`, PR, cron `0 6 * * 1` (poniedziałek), `workflow_dispatch`

Używa shared workflow:
```yaml
uses: MaciekStrzelbicki/github-shared-workflows/.github/workflows/security-scan.yml@main
with:
  run-trivy-container: false   # biblioteka, brak Dockerfile
```

---

## 12. Zmienne środowiskowe

| Zmienna | Opis | Wymagana |
|---|---|---|
| `REGON_API_KEY` | Klucz użytkownika BIR | Tak |
| `REGON_ENV` | `production` lub `test` | Nie (default: `production`) |
| `REGON_TIMEOUT_MS` | Timeout HTTP w ms | Nie (default: `30000`) |

Sekrety GitHub (repo secrets):
- `NPM_TOKEN` lub `GITHUB_TOKEN` — do publishowania pakietu

---

## 13. Przykład użycia (Next.js App Router)

```typescript
// app/api/company/route.ts
import { RegonClient } from '@gmymms/regon-client'

const regon = new RegonClient({ apiKey: process.env.REGON_API_KEY! })

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const nip = searchParams.get('nip')
  
  const company = await regon.getCompanyByNip(nip!)
  return Response.json(company)
}
```

---

## 14. Roadmap v1 → v2

| v1 (scope tej implementacji) | v2 (future) |
|---|---|
| `searchByNip`, `getFullReport`, `getCompanyByNip` | Batch NIP (do 20 jednocześnie) |
| Typy `P` (os. prawna) i `F` CEIDG | Wszystkie typy raportów + PKD |
| Auto-session | Session pooling |
| Testy jednostkowe | Testy integracyjne (sandbox) |
| GitHub Packages | npm public registry |
