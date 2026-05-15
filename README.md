# @gmymms/regon-client

TypeScript client for the GUS BIR1.1 REGON API. Look up Polish company data by NIP, REGON, or KRS number.

> **Server-side only** — the GUS SOAP service blocks CORS. Use in Next.js API routes, Server Actions, or any Node.js backend.

## Installation

```bash
npm install @gmymms/regon-client
```

## Usage

```typescript
import { RegonClient } from '@gmymms/regon-client'

const regon = new RegonClient({
  apiKey: process.env.REGON_API_KEY!,
  env: 'production', // or 'test'
})

// Fetch company data by NIP (search + full report in one call)
const company = await regon.getCompanyByNip('5260250216')
console.log(company.name)          // "PRZYKŁADOWA SPÓŁKA Z O.O."
console.log(company.report)        // { praw_regon9: '...', praw_nazwa: '...', ... }

// Search only
const [entity] = await regon.searchByNip('5260250216')

// Manual session (batch processing)
await regon.login()
const a = await regon.searchByNip('5260250216')
const b = await regon.searchByNip('7272445205')
await regon.logout()
```

### Next.js App Router example

```typescript
// app/api/company/route.ts
import { RegonClient } from '@gmymms/regon-client'

const client = new RegonClient({ apiKey: process.env.REGON_API_KEY! })

export async function GET(req: Request) {
  const nip = new URL(req.url).searchParams.get('nip')!
  const company = await client.getCompanyByNip(nip)
  return Response.json(company)
}
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `REGON_API_KEY` | BIR user key from GUS | — |
| `REGON_ENV` | `production` or `test` | `production` |
| `REGON_TIMEOUT_MS` | HTTP timeout (ms) | `30000` |

Get a free API key at [api.stat.gov.pl](https://api.stat.gov.pl/Home/RegonApi).  
Test key: `abcde12345abcde12345`

## API

See [SPEC.md](./SPEC.md) for full specification.

## License

MIT
