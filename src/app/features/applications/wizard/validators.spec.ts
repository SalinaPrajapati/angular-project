import { FormControl, FormGroup } from '@angular/forms';
import {
  bankAccountNumber,
  phoneNumber,
  registrationNumber,
  taxId,
  ticketWithinVolume,
  websiteUrl,
} from './validators';

const check = (validator: ReturnType<typeof phoneNumber>, value: unknown) =>
  validator(new FormControl(value));

describe('custom validators', () => {
  it('accepts empty values so Validators.required can report them', () => {
    for (const v of [phoneNumber(), registrationNumber(), bankAccountNumber(), taxId(), websiteUrl()]) {
      expect(check(v, '')).toBeNull();
    }
  });

  it('validates phone numbers', () => {
    expect(check(phoneNumber(), '+1 (555) 010-2030')).toBeNull();
    expect(check(phoneNumber(), '12345')).not.toBeNull();
    expect(check(phoneNumber(), 'call me')).not.toBeNull();
  });

  it('validates registration numbers', () => {
    expect(check(registrationNumber(), 'REG-123456')).toBeNull();
    expect(check(registrationNumber(), 'ab')).not.toBeNull();
    expect(check(registrationNumber(), 'REG 123456')).not.toBeNull();
  });

  it('validates bank account numbers', () => {
    expect(check(bankAccountNumber(), '0012345678')).toBeNull();
    expect(check(bankAccountNumber(), '1234')).not.toBeNull();
    expect(check(bankAccountNumber(), '1234 5678 90')).not.toBeNull();
  });

  it('validates tax ids', () => {
    expect(check(taxId(), '12-3456789')).toBeNull();
    expect(check(taxId(), '123456789')).toBeNull();
    expect(check(taxId(), '12-345')).not.toBeNull();
  });

  it('validates website addresses', () => {
    expect(check(websiteUrl(), 'https://example.com')).toBeNull();
    expect(check(websiteUrl(), 'example.com')).not.toBeNull();
    expect(check(websiteUrl(), 'javascript:alert(1)')).not.toBeNull();
  });

  it('rejects an average ticket larger than the monthly volume', () => {
    const group = new FormGroup({
      monthlyVolume: new FormControl<number | null>(5000),
      averageTicket: new FormControl<number | null>(null, [ticketWithinVolume()]),
    });
    group.controls.averageTicket.setValue(100);
    expect(group.controls.averageTicket.errors).toBeNull();
    group.controls.averageTicket.setValue(9000);
    expect(group.controls.averageTicket.errors?.['invalid']).toContain('cannot be larger');
  });
});
