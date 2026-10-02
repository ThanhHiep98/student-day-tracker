import { describe, expect, it } from 'vitest';
import { getGivenName, getInitial } from './get-given-name';

describe('getInitial', () => {
  it('is the uppercased first letter of the display name, else the email, else ?', () => {
    expect(getInitial('Minh Anh', 'x@example.com')).toBe('M');
    expect(getInitial('  đức', null)).toBe('Đ');
    expect(getInitial(null, 'an@example.com')).toBe('A');
    expect(getInitial('', '')).toBe('?');
  });
});

describe('getGivenName', () => {
  it('uses the last word of a Vietnamese-order display name', () => {
    expect(getGivenName('Minh Anh', 'minhanh.lop12@gmail.com')).toBe('Anh');
    expect(getGivenName('Nguyễn Thị  Minh Anh ', null)).toBe('Anh');
  });

  it('uses a single-word display name as is', () => {
    expect(getGivenName('Hiếu', null)).toBe('Hiếu');
  });

  it('falls back to the email local part when the display name is empty', () => {
    expect(getGivenName(null, 'minhanh.lop12@gmail.com')).toBe('minhanh.lop12');
    expect(getGivenName('   ', 'an@example.com')).toBe('an');
  });

  it('returns null when neither gives a name', () => {
    expect(getGivenName(null, null)).toBeNull();
    expect(getGivenName('', '')).toBeNull();
    expect(getGivenName(undefined, '@example.com')).toBeNull();
  });
});
