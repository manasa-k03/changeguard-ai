// Quick smoke-test: boots the server, hits /health, then exits cleanly.
// Usage: node test-server.js
process.env.DB_PATH = './data/test-smoke.db';

const app = require('./src/server'); // server.js exports app AND calls start()

// Give start() time to init DB and bind port
setTimeout(async () => {
  const http = require('http');
  const checks = [];

  const get = (path) =>
    new Promise((resolve) => {
      const req = http.get(`http://localhost:5000${path}`, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      req.setTimeout(3000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    });

  const post = (path, data) =>
    new Promise((resolve) => {
      const payload = JSON.stringify(data);
      const options = {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      };
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      req.write(payload);
      req.end();
    });

  console.log('\n--- Running smoke tests ---\n');

  // 1. Health check
  let r = await get('/health');
  const healthOk = r.status === 200 && JSON.parse(r.body).status === 'ok';
  checks.push({ name: 'GET /health → 200', pass: healthOk });
  if (healthOk) console.log('✔ GET /health →', r.body);
  else console.log('✘ GET /health FAILED:', r);

  // 2. Unknown route → 404
  r = await get('/api/nonexistent');
  checks.push({ name: 'GET /api/unknown → 404', pass: r.status === 404 });
  console.log(r.status === 404 ? '✔' : '✘', `GET /api/unknown → ${r.status}`);

  // 3. Register new user
  const email = `test_${Date.now()}@example.com`;
  r = await post('/api/auth/register', {
    name: 'Test User',
    email,
    password: 'TestPass1',
    confirmPassword: 'TestPass1',
  });
  const regOk = r.status === 201 && JSON.parse(r.body).token;
  checks.push({ name: 'POST /api/auth/register → 201 + token', pass: regOk });
  console.log(regOk ? '✔' : '✘', `POST /api/auth/register → ${r.status} ${regOk ? '(token present)' : r.body}`);
  const token = regOk ? JSON.parse(r.body).token : null;

  // 4. Duplicate email → 409
  r = await post('/api/auth/register', {
    name: 'Test User',
    email,
    password: 'TestPass1',
    confirmPassword: 'TestPass1',
  });
  checks.push({ name: 'Duplicate email → 409', pass: r.status === 409 });
  console.log(r.status === 409 ? '✔' : '✘', `Duplicate email → ${r.status}`);

  // 5. Login
  r = await post('/api/auth/login', { email, password: 'TestPass1' });
  const loginOk = r.status === 200 && JSON.parse(r.body).token;
  checks.push({ name: 'POST /api/auth/login → 200 + token', pass: loginOk });
  console.log(loginOk ? '✔' : '✘', `POST /api/auth/login → ${r.status}`);

  // 6. Wrong password → 401
  r = await post('/api/auth/login', { email, password: 'WrongPass9' });
  checks.push({ name: 'Wrong password → 401', pass: r.status === 401 });
  console.log(r.status === 401 ? '✔' : '✘', `Wrong password → ${r.status}`);

  // 7. Protected route without token → 401
  r = await get('/api/analyses');
  checks.push({ name: 'No token → 401', pass: r.status === 401 });
  console.log(r.status === 401 ? '✔' : '✘', `Protected route no token → ${r.status}`);

  // 8. Run analysis (authenticated)
  if (token) {
    const analyzePost = (path, data, tok) =>
      new Promise((resolve) => {
        const payload = JSON.stringify(data);
        const options = {
          hostname: 'localhost', port: 5000, path, method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Authorization': `Bearer ${tok}`,
          },
        };
        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', (e) => resolve({ status: 0, error: e.message }));
        req.write(payload);
        req.end();
      });

    r = await analyzePost('/api/analyses', { inputText: 'Deploy new version to production server with database migration.' }, token);
    const analysisOk = r.status === 201 && JSON.parse(r.body).id;
    checks.push({ name: 'POST /api/analyses → 201', pass: analysisOk });
    console.log(analysisOk ? '✔' : '✘', `POST /api/analyses → ${r.status} ${analysisOk ? '(id: ' + JSON.parse(r.body).id.slice(0,8) + '...)' : r.body.slice(0,200)}`);

    if (analysisOk) {
      const aid = JSON.parse(r.body).id;

      // 9. Get history (authenticated, with Authorization header)
      const authGet = (path, tok) =>
        new Promise((resolve) => {
          const options = {
            hostname: 'localhost', port: 5000, path, method: 'GET',
            headers: { 'Authorization': `Bearer ${tok}` },
          };
          const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => resolve({ status: res.statusCode, body }));
          });
          req.on('error', (e) => resolve({ status: 0, error: e.message }));
          req.end();
        });

      r = await authGet('/api/analyses', token);
      const histOk = r.status === 200 && JSON.parse(r.body).analyses.length > 0;
      checks.push({ name: 'GET /api/analyses → history present', pass: histOk });
      console.log(histOk ? '✔' : '✘', `GET /api/analyses → ${r.status} (${histOk ? JSON.parse(r.body).analyses.length + ' item(s)' : r.body.slice(0,100)})`);

      // 10. Get single analysis
      r = await authGet(`/api/analyses/${aid}`, token);
      const singleOk = r.status === 200 && JSON.parse(r.body).id === aid;
      checks.push({ name: 'GET /api/analyses/:id → correct record', pass: singleOk });
      console.log(singleOk ? '✔' : '✘', `GET /api/analyses/${aid.slice(0,8)}... → ${r.status}`);

      // 11. Delete analysis
      const delPost = (path, tok) =>
        new Promise((resolve) => {
          const options = {
            hostname: 'localhost', port: 5000, path, method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tok}` },
          };
          const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => resolve({ status: res.statusCode, body }));
          });
          req.on('error', (e) => resolve({ status: 0, error: e.message }));
          req.end();
        });

      r = await delPost(`/api/analyses/${aid}`, token);
      checks.push({ name: 'DELETE /api/analyses/:id → 200', pass: r.status === 200 });
      console.log(r.status === 200 ? '✔' : '✘', `DELETE /api/analyses/${aid.slice(0,8)}... → ${r.status}`);
    }

    // 12. Cross-user isolation — register second user, verify empty history
    const email2 = `test2_${Date.now()}@example.com`;
    r = await post('/api/auth/register', {
      name: 'User Two', email: email2,
      password: 'TestPass1', confirmPassword: 'TestPass1',
    });
    const token2 = r.status === 201 ? JSON.parse(r.body).token : null;
    if (token2) {
      const authGet = (path, tok) =>
        new Promise((resolve) => {
          const options = {
            hostname: 'localhost', port: 5000, path, method: 'GET',
            headers: { 'Authorization': `Bearer ${tok}` },
          };
          const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => resolve({ status: res.statusCode, body }));
          });
          req.on('error', (e) => resolve({ status: 0, error: e.message }));
          req.end();
        });
      r = await authGet('/api/analyses', token2);
      const isolationOk = r.status === 200 && JSON.parse(r.body).analyses.length === 0;
      checks.push({ name: 'User isolation: user2 sees empty history', pass: isolationOk });
      console.log(isolationOk ? '✔' : '✘', `User isolation → user2 history length: ${r.status === 200 ? JSON.parse(r.body).analyses.length : 'error'} (expected 0)`);
    }
  }

  // Summary
  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.filter((c) => !c.pass);
  console.log(`\n--- Results: ${passed}/${checks.length} passed ---`);
  if (failed.length) {
    console.log('FAILED:');
    failed.forEach((f) => console.log('  ✘', f.name));
  } else {
    console.log('All tests passed ✅');
  }

  // Cleanup test DB
  try { require('fs').unlinkSync('./data/test-smoke.db'); } catch {}
  process.exit(failed.length ? 1 : 0);
}, 2000);
