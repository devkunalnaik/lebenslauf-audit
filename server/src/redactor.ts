import type { RedactedText, RedactionsApplied } from "./types.js";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?<!\w)(?:\+\d{1,3}[\s().-]*)?(?:\(?\d{2,5}\)?[\s().-]*)\d{3,5}[\s.-]?\d{3,6}(?!\w)/g;
const STREET_PATTERN = /\b\d{1,6}\s+[\p{L}][\p{L}\p{M}.'’-]*(?:\s+[\p{L}\p{M}.'’-]+){0,4}\s+(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|platz|straße|strasse|str\.?|weg|gasse)\b(?:,?\s*\d{4,6}(?:\s+[\p{L}][\p{L}\p{M}.'’-]+(?:\s+[\p{L}\p{M}.'’-]+){0,2})?)?/giu;
const POSTAL_CITY_PATTERN = /\b\d{5}\s+[A-ZÄÖÜ][\p{L}\p{M}.'’-]+(?:\s+[\p{L}\p{M}.'’-]+){0,2}\b/gu;

function scrub(text: string, pattern: RegExp): { text: string; count: number } {
  let count = 0;
  const scrubbed = text.replace(pattern, () => {
    count += 1;
    return "[REDACTED]";
  });
  return { text: scrubbed, count };
}

export function redactPii(text: string): RedactedText {
  const email = scrub(text, EMAIL_PATTERN);
  const phone = scrub(email.text, PHONE_PATTERN);
  const street = scrub(phone.text, STREET_PATTERN);
  const postalCity = scrub(street.text, POSTAL_CITY_PATTERN);
  const redactionsApplied: RedactionsApplied = {
    emails: email.count,
    phone_numbers: phone.count,
    addresses: street.count + postalCity.count,
    total: email.count + phone.count + street.count + postalCity.count
  };
  return { redactedText: postalCity.text, redactionsApplied };
}
