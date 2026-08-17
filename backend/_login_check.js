// Headless test: login as An, navigate to /messages, capture DOM
const edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe';
const dumpDir = process.env.TEMP + '\\hcheck';
require('fs').mkdirSync(dumpDir, { recursive: true });

// Login first via curl to get token
async function login() {
  const r = await fetch('https://backend.freelancerhub.io.vn/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'an.nguyen@example.vn', password: 'Freelancer1234!' }),
  });
  const j = await r.json();
  return j.data.access_token;
}

login().then(token => {
  console.log('Token obtained, len:', token.length);
  // Inject token into localStorage via a pre-loaded HTML
  // Then navigate to /messages
}).catch(e => console.error('Login failed:', e));