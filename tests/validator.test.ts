import { describe, it, expect } from "vitest";
import { validateNip, validateRegon } from "../src/validator.js";
import { RegonValidationError } from "../src/errors.js";

describe("validateNip", () => {
  it("accepts valid NIP", () => {
    expect(validateNip("5260250216")).toBe("5260250216");
  });

  it("strips spaces and dashes", () => {
    expect(validateNip("526-025-02-16")).toBe("5260250216");
    expect(validateNip("526 025 02 16")).toBe("5260250216");
  });

  it("throws on non-digit characters", () => {
    expect(() => validateNip("526X250216")).toThrow(RegonValidationError);
  });

  it("throws on wrong length", () => {
    expect(() => validateNip("123456789")).toThrow(RegonValidationError);
    expect(() => validateNip("12345678901")).toThrow(RegonValidationError);
  });

  it("throws on invalid checksum", () => {
    expect(() => validateNip("5260250217")).toThrow(RegonValidationError);
  });

  it("error has correct field", () => {
    try {
      validateNip("0000000000");
    } catch (e) {
      expect(e).toBeInstanceOf(RegonValidationError);
      expect((e as RegonValidationError).field).toBe("nip");
    }
  });
});

describe("validateRegon (9-digit)", () => {
  it("accepts valid 9-digit REGON", () => {
    expect(validateRegon("142396858")).toBe("142396858");
  });

  it("throws on invalid checksum", () => {
    expect(() => validateRegon("142396859")).toThrow(RegonValidationError);
  });

  it("throws on wrong length", () => {
    expect(() => validateRegon("12345678")).toThrow(RegonValidationError);
  });
});

describe("validateRegon (14-digit)", () => {
  it("accepts valid 14-digit REGON", () => {
    expect(validateRegon("14239685800002")).toBe("14239685800002");
  });

  it("throws on invalid 14-digit checksum", () => {
    expect(() => validateRegon("14239685800003")).toThrow(RegonValidationError);
  });

  it("throws if base 9 digits are invalid", () => {
    expect(() => validateRegon("99999999900000")).toThrow(RegonValidationError);
  });

  it("error has correct field", () => {
    try {
      validateRegon("00000000000000");
    } catch (e) {
      expect(e).toBeInstanceOf(RegonValidationError);
      expect((e as RegonValidationError).field).toBe("regon");
    }
  });
});
