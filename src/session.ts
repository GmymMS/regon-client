import { callSoap } from "./soap.js";
import { extractResult } from "./parser.js";
import { RegonAuthError, RegonSessionError } from "./errors.js";

const LOGIN_ACTION = "http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj";
const LOGOUT_ACTION = "http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Wyloguj";

export async function login(url: string, apiKey: string, timeoutMs: number): Promise<string> {
  const body = `<ns:Zaloguj><ns:pKluczUzytkownika>${apiKey}</ns:pKluczUzytkownika></ns:Zaloguj>`;
  const xml = await callSoap(url, LOGIN_ACTION, body, undefined, timeoutMs);
  const sessionId = extractResult(xml, "ZalogujResult") as string;
  if (!sessionId || sessionId.trim() === "00000000-0000-0000-0000-000000000000") {
    throw new RegonAuthError("Login failed — invalid API key or service unavailable");
  }
  return sessionId;
}

export async function logout(url: string, sessionId: string, timeoutMs: number): Promise<void> {
  const body = `<ns:Wyloguj><ns:pIdentyfikatorSesji>${sessionId}</ns:pIdentyfikatorSesji></ns:Wyloguj>`;
  try {
    await callSoap(url, LOGOUT_ACTION, body, sessionId, timeoutMs);
  } catch {
    // Logout errors are non-fatal — session expires server-side anyway
  }
}

export class Session {
  private sessionId: string | null = null;
  private loginPromise: Promise<string> | null = null;

  constructor(
    private readonly url: string,
    private readonly apiKey: string,
    private readonly timeoutMs: number
  ) {}

  async get(): Promise<string> {
    if (this.sessionId) return this.sessionId;
    if (this.loginPromise) return this.loginPromise;

    this.loginPromise = login(this.url, this.apiKey, this.timeoutMs).then((id) => {
      this.sessionId = id;
      this.loginPromise = null;
      return id;
    });
    return this.loginPromise;
  }

  invalidate(): void {
    this.sessionId = null;
    this.loginPromise = null;
  }

  async close(): Promise<void> {
    if (this.sessionId) {
      await logout(this.url, this.sessionId, this.timeoutMs);
      this.sessionId = null;
    }
  }

  async withSession<T>(fn: (sessionId: string) => Promise<T>): Promise<T> {
    const id = await this.get();
    try {
      return await fn(id);
    } catch (err) {
      if (err instanceof RegonSessionError) {
        this.invalidate();
        const freshId = await this.get();
        return fn(freshId);
      }
      throw err;
    }
  }
}
