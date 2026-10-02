import { describe, expect, it } from 'vitest';
import { buildUserProfile } from './build-user-profile';

describe('buildUserProfile', () => {
  it('builds exactly the profile fields, with privacyAcceptedAt = createdAt', () => {
    const profile = buildUserProfile(
      {
        displayName: 'Minh Anh',
        email: 'minhanh.lop12@gmail.com',
        photoURL: 'https://example.com/a.png',
      },
      1_700_000_000_000
    );
    expect(profile).toEqual({
      displayName: 'Minh Anh',
      email: 'minhanh.lop12@gmail.com',
      photoURL: 'https://example.com/a.png',
      createdAt: 1_700_000_000_000,
      privacyAcceptedAt: 1_700_000_000_000,
    });
    expect(Object.keys(profile).sort()).toEqual([
      'createdAt',
      'displayName',
      'email',
      'photoURL',
      'privacyAcceptedAt',
    ]);
  });

  it('turns missing Google fields into empty strings / null', () => {
    expect(buildUserProfile({ displayName: null, email: null, photoURL: null }, 5)).toEqual({
      displayName: '',
      email: '',
      photoURL: null,
      createdAt: 5,
      privacyAcceptedAt: 5,
    });
  });

  it('trims and caps the display name at the rules limit', () => {
    const profile = buildUserProfile(
      { displayName: `  ${'a'.repeat(250)}  `, email: 'x@y.z', photoURL: null },
      1
    );
    expect(profile.displayName).toHaveLength(200);
  });
});
