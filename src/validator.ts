import { RegonValidationError } from "./errors.js";

export function validateNip(nip: string): string {
  const digits = nip.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(digits)) {
    throw new RegonValidationError(`NIP must be exactly 10 digits, got: "${nip}"`, "nip");
  }
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  if (sum % 11 !== Number(digits[9])) {
    throw new RegonValidationError(`NIP checksum invalid: "${nip}"`, "nip");
  }
  return digits;
}

export function validateRegon(regon: string): string {
  const digits = regon.replace(/\s/g, "");
  if (digits.length === 9) {
    return validateRegon9(digits, regon);
  }
  if (digits.length === 14) {
    return validateRegon14(digits, regon);
  }
  throw new RegonValidationError(`REGON must be 9 or 14 digits, got: "${regon}"`, "regon");
}

function validateRegon9(digits: string, original: string): string {
  if (!/^\d{9}$/.test(digits)) {
    throw new RegonValidationError(`REGON must contain only digits: "${original}"`, "regon");
  }
  const weights = [8, 9, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const checksum = sum % 11 === 10 ? 0 : sum % 11;
  if (checksum !== Number(digits[8])) {
    throw new RegonValidationError(`REGON checksum invalid: "${original}"`, "regon");
  }
  return digits;
}

function validateRegon14(digits: string, original: string): string {
  if (!/^\d{14}$/.test(digits)) {
    throw new RegonValidationError(`REGON must contain only digits: "${original}"`, "regon");
  }
  validateRegon9(digits.slice(0, 9), original);
  const weights = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const checksum = sum % 11 === 10 ? 0 : sum % 11;
  if (checksum !== Number(digits[13])) {
    throw new RegonValidationError(`REGON-14 checksum invalid: "${original}"`, "regon");
  }
  return digits;
}
