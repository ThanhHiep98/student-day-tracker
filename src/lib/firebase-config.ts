// Public web config for the `student-day-tracker` Firebase project (plan §2.1
// "Fixed facts"). Not a secret: it ships in every client bundle; access is
// enforced by firestore.rules and Auth's authorized domains.
export const firebaseConfig = {
  apiKey: 'AIzaSyAyyuuezgfY5b1tB8Oo0yog83TP5z1EU7A',
  authDomain: 'student-day-tracker.firebaseapp.com',
  projectId: 'student-day-tracker',
  storageBucket: 'student-day-tracker.firebasestorage.app',
  messagingSenderId: '203051636156',
  appId: '1:203051636156:web:3ea7820a2a8098dd0947b9',
};

/**
 * App Check reCAPTCHA Enterprise site key (ADR-009 §2.2 D12). A score-based
 * site key, not a secret — it's meant to ship in the client, same as
 * `firebaseConfig` above; App Check enforcement itself stays off until the
 * owner flips it on in the Firebase console after this release is verified.
 */
export const APP_CHECK_SITE_KEY = '6LfvG9stAAAAAJ5N4S63oaDKwUsVCZtNdn0bC0lc';
