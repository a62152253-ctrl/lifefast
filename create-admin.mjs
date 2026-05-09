// One-time script: creates the admin account in Firebase Auth + Firestore
const API_KEY      = 'AIzaSyAb8SPI8SKNsRiHsh0AQdTGoAaiTR22qkk';
const PROJECT_ID   = 'ai-studio-applet-webapp-ff4dd';
const DATABASE_ID  = 'ai-studio-706c02b6-48a9-412e-967a-5b843ea607fd';
const ADMIN_EMAIL  = 'k@lifefast.admin';
const ADMIN_PASS   = 'JSS7D2D#@@$@#@#DA2-/*';

async function run() {
  // 1. Create user in Firebase Auth
  console.log('Tworzenie konta w Firebase Auth...');
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS, returnSecureToken: true }),
    }
  );
  const authData = await authRes.json();

  if (authData.error) {
    if (authData.error.message === 'EMAIL_EXISTS') {
      console.log('✓ Konto już istnieje w Firebase Auth.');
      // Sign in to get idToken and uid
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS, returnSecureToken: true }),
        }
      );
      const signInData = await signInRes.json();
      if (signInData.error) throw new Error('Błąd logowania: ' + signInData.error.message);
      await createProfile(signInData.localId, signInData.idToken);
      return;
    }
    throw new Error('Błąd tworzenia konta: ' + authData.error.message);
  }

  console.log(`✓ Konto utworzone. UID: ${authData.localId}`);
  await createProfile(authData.localId, authData.idToken);
}

async function createProfile(uid, idToken) {
  // 2. Write userProfile to Firestore
  console.log('Zapisywanie profilu admina w Firestore...');
  const fsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/userProfiles/${uid}`;

  const fsRes = await fetch(fsUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        uid:         { stringValue: uid },
        email:       { stringValue: ADMIN_EMAIL },
        displayName: { stringValue: 'Admin' },
        role:        { stringValue: 'admin' },
        createdAt:   { timestampValue: new Date().toISOString() },
      },
    }),
  });

  const fsData = await fsRes.json();
  if (fsData.error) throw new Error('Błąd Firestore: ' + fsData.error.message);

  console.log('✓ Profil admina zapisany w Firestore.');
  console.log('\n=== GOTOWE ===');
  console.log(`Email:  ${ADMIN_EMAIL}`);
  console.log(`Hasło:  ${ADMIN_PASS}`);
  console.log('Możesz się teraz zalogować przez /login\n');
}

run().catch(err => {
  console.error('❌ Błąd:', err.message);
  process.exit(1);
});
