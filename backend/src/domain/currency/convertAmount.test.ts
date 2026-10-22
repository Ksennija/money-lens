import { convertAmountCents } from './convertAmount.js';

describe('convertAmountCents', () => {
  it('converts using the rate and rounds to whole cents', () => {
    expect(convertAmountCents(10000, 0.8693)).toBe(8693);
    expect(convertAmountCents(333, 0.8693)).toBe(289);
  });

  it('keeps the sign of the amount', () => {
    expect(convertAmountCents(-10000, 0.8693)).toBe(-8693);
  });

  it('rounds half away from zero in both directions', () => {
    expect(convertAmountCents(5, 0.5)).toBe(3);
    expect(convertAmountCents(-5, 0.5)).toBe(-3);
  });

  it('returns 0 (not -0) for a zero amount', () => {
    expect(Object.is(convertAmountCents(0, 0.9), 0)).toBe(true);
  });
});
