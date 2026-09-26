// Final integration check: verifies frontend build output + backend together
// Starts the backend, waits for readiness, runs integration calls, exits.
'use strict';
process.env.DB_PATH = './data/final-check.db';

const http = require('http');
const { execSync } = require('child_process');

// ── helpers ────────────────────────────────────────────────────────────────
const request = (opts, body) =>
  new Promise((resolve) => {
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', (e) => resolve({ status: 0, err: e.message }));
    r.setTimeout(5000, () => { r.destroy(); resolve({ status: 0, err: 'timeout' }); });
    if (body) r.write(body);
    r.end();
  });

const get  = (path, tok) => request({ hostname:'localhost', port:5000, path, method:'GET',  headers: tok ? { Authorization:`Bearer ${tok}` } : {} });
const post = (path, data, tok) => {
  const b = JSON.stringify(data);
  return request({
    hostname:'localhost', port:5000, path, method:'POST',
    headers: { 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(b), ...(tok ? { Authorization:`Bearer ${tok}` } : {}) },
  }, b);
};
const del  = (path, tok) => request({ hostname:'localhost', port:5000, path, method:'DELETE', headers: tok ? { Authorization:`Bearer ${tok}` } : {} });

// ── boot server ────────────────────────────────────────────────────────────
const app = require('./src/server');
const results = [];
let PASS = 0, FAIL = 0;

const check = (name, actual, expected) => {
  const ok = actual === expected;
  console.log(ok ? `  ✔` : `  ✘`, name, ok ? '' : `(got ${actual}, want ${expected})`);
  results.push({ name, ok });
  ok ? PASS++ : FAIL++;
};

setTimeout(async () => {
  console.log('\n══════════════════════════════════════════');
  console.log('  ChangeGuard AI — Final Integration Check');
  console.log('══════════════════════════════════════════\n');

  // 1. Health
  let r = await get('/health');
  check('GET /health → 200', r.status, 200);
  const health = JSON.parse(r.body);
  check('Health status = ok', health.status, 'ok');
  check('AI mode reported', typeof health.aiMode === 'string', true);

  // 2. 404
  r = await get('/api/nonexistent');
  check('Unknown route → 404', r.status, 404);

  // 3. Validation — missing fields
  r = await post('/api/auth/register', { name:'', email:'bad', password:'x', confirmPassword:'x' });
  check('Validation error → 400', r.status, 400);

  // 4. Register
  const email = `final_${Date.now()}@example.com`;
  r = await post('/api/auth/register', { name:'Final User', email, password:'FinalPass1', confirmPassword:'FinalPass1' });
  check('Register → 201', r.status, 201);
  const token1 = r.status === 201 ? JSON.parse(r.body).token : null;
  check('Register returns token', !!token1, true);

  // 5. Duplicate email
  r = await post('/api/auth/register', { name:'Final User', email, password:'FinalPass1', confirmPassword:'FinalPass1' });
  check('Duplicate email → 409', r.status, 409);

  // 6. Login
  r = await post('/api/auth/login', { email, password:'FinalPass1' });
  check('Login → 200', r.status, 200);
  check('Login returns token', !!JSON.parse(r.body).token, true);

  // 7. Wrong password
  r = await post('/api/auth/login', { email, password:'Wrong999' });
  check('Wrong password → 401', r.status, 401);

  // 8. /me endpoint
  r = await get('/api/auth/me', token1);
  check('GET /api/auth/me → 200', r.status, 200);
  const me = JSON.parse(r.body).user;
  check('/me email matches', me.email, email);

  // 9. Protected without token
  r = await get('/api/analyses');
  check('No token → 401', r.status, 401);

  // 10. Short input validation
  r = await post('/api/analyses', { inputText: 'short' }, token1);
  check('Too-short input → 400', r.status, 400);

  // 11. Run full analysis
  r = await post('/api/analyses', { inputText: 'Deploy new API version v2 to production with database schema migration and cache invalidation.' }, token1);
  check('POST /api/analyses → 201', r.status, 201);
  const analysis = r.status === 201 ? JSON.parse(r.body) : null;
  check('Analysis has id', !!(analysis && analysis.id), true);
  check('Analysis has result', !!(analysis && analysis.result), true);
  check('Result has riskLevel', !!(analysis && analysis.result && analysis.result.riskLevel), true);
  check('Result has recommendations array', Array.isArray(analysis && analysis.result && analysis.result.recommendations), true);
  check('Result has potentialRisks array', Array.isArray(analysis && analysis.result && analysis.result.potentialRisks), true);
  check('Result has rollbackPlan', !!(analysis && analysis.result && analysis.result.rollbackPlan), true);
  const aid = analysis ? analysis.id : null;

  // 12. History
  r = await get('/api/analyses', token1);
  check('GET history → 200', r.status, 200);
  const list = JSON.parse(r.body).analyses;
  check('History has 1 item', list.length, 1);
  check('History item has risk_level', !!list[0].risk_level, true);
  check('History item has input_text', !!list[0].input_text, true);

  // 13. Single analysis fetch
  r = await get(`/api/analyses/${aid}`, token1);
  check('GET /analyses/:id → 200', r.status, 200);
  check('Single fetch id matches', JSON.parse(r.body).id, aid);

  // 14. User isolation — register user2, verify separate history
  const email2 = `final2_${Date.now()}@example.com`;
  r = await post('/api/auth/register', { name:'User Two', email:email2, password:'FinalPass1', confirmPassword:'FinalPass1' });
  const token2 = r.status === 201 ? JSON.parse(r.body).token : null;
  check('Register user2 → 201', r.status, 201);

  r = await get('/api/analyses', token2);
  check('User2 history is empty', JSON.parse(r.body).analyses.length, 0);

  // 15. User1 fetch with user2 token → 404
  if (aid && token2) {
    r = await get(`/api/analyses/${aid}`, token2);
    check('Cross-user fetch → 404', r.status, 404);
  }

  // 16. Delete
  if (aid) {
    r = await del(`/api/analyses/${aid}`, token1);
    check('DELETE analysis → 200', r.status, 200);
    r = await get(`/api/analyses/${aid}`, token1);
    check('Deleted item → 404', r.status, 404);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log(`  Results: ${PASS}/${PASS+FAIL} passed`);
  if (FAIL > 0) {
    console.log('\n  FAILED:');
    results.filter(x => !x.ok).forEach(x => console.log(`    ✘ ${x.name}`));
  } else {
    console.log('  All checks passed ✅');
  }
  console.log('══════════════════════════════════════════\n');

  // cleanup
  try { require('fs').unlinkSync('./data/final-check.db'); } catch {}
  process.exit(FAIL > 0 ? 1 : 0);
}, 2500);
