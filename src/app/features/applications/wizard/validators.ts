import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

const matches =
  (test: (value: string) => boolean, message: string): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? "").trim();
    return value === "" || test(value) ? null : { invalid: message };
  };

export const phoneNumber = () =>
  matches(
    (v) => /^\+?\d{7,15}$/.test(v.replace(/[\s().-]/g, "")),
    "Enter a phone number with 7 to 15 digits, for example +1 555 010 2030.",
  );

export const registrationNumber = () =>
  matches(
    (v) => /^[A-Z0-9-]{6,14}$/i.test(v),
    "Use 6 to 14 letters, digits or hyphens, for example REG-123456.",
  );

export const bankAccountNumber = () =>
  matches((v) => /^\d{8,17}$/.test(v), "Enter 8 to 17 digits, with no spaces.");

export const taxId = () =>
  matches((v) => /^\d{2}-?\d{7}$/.test(v), "Use the format 12-3456789.");

export const websiteUrl = () =>
  matches((v) => {
    try {
      const { protocol } = new URL(v);
      return protocol === "https:" || protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a full web address, for example https://example.com.");

export const ticketWithinVolume = (): ValidatorFn => (control) => {
  const ticket = Number(control.value);
  const volume = Number(control.parent?.get("monthlyVolume")?.value);
  return control.value && volume && ticket > volume
    ? {
        invalid: "The average ticket cannot be larger than the monthly volume.",
      }
    : null;
};
