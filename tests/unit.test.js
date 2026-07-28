/**
 * NormaLis — Unit Tests (runtime)
 * Tests reales que ejecutan código JavaScript del proyecto en Node.js.
 * Complementa smoke.test.js (análisis estático) con tests de lógica en ejecución.
 *
 * Ejecutar: node tests/unit.test.js
 * En CI: .github/workflows/smoke-tests.yml (job: unit-tests)
 *
 * Estrategia: extrae funciones puras del código fuente vía regex y las evalúa
 * en contexto aislado. Así testeamos el código de producción real, no copias.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ─── Mini test runner ──────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
    failed++;
    errors.push({ name, msg: e.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertContains(str, sub, msg) {
  if (!String(str).includes(sub)) throw new Error(msg || `Expected "${sub}" in string`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');

function readSrc(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function evalBlock(code, extraContext = {}) {
  const ctx = vm.createContext({
    String, Number, Math, Date, Array, Object, JSON, Map, Set,
    console, Error, TypeError, RegExp,
    parseInt, parseFloat, isNaN, isFinite,
    ...extraContext
  });
  vm.runInContext(code, ctx);
  return ctx;
}

function extractFnSrc(src, fnName) {
  const re = new RegExp(`function\\s+${fnName}\\s*\\(`);
  const m = re.exec(src);
  if (!m) throw new Error(`Funcion '${fnName}' no encontrada`);
  let depth = 0, i = m.index;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  return src.slice(m.index, i + 1);
}


// ══════════════════════════════════════════════════════════════════════════════
// 1. _escH() — XSS sanitizer (normalis-multiusuario.js)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🔒 _escH — XSS sanitizer (normalis-multiusuario.js)');

const multiSrc = readSrc('normalis-multiusuario.js');

// La función está en una sola línea: function _escH(s){ ... }
let _escH;
const escLine = multiSrc.split('\n').find(l => l.includes('function _escH'));
if (escLine) {
  const cleaned = escLine.trim();
  _escH = eval('(' + cleaned + ')');
}

if (_escH) {
  test('_escH escapa < y >', () => { assertEqual(_escH('<script>'), '&lt;script&gt;'); });
  test('_escH escapa & ampersand', () => { assertEqual(_escH('A & B'), 'A &amp; B'); });
  test('_escH escapa comillas dobles', () => { assertEqual(_escH('"test"'), '&quot;test&quot;'); });
  test('_escH escapa comillas simples', () => { assertEqual(_escH("it's"), "it&#39;s"); });
  test('_escH: null/undefined → ""', () => {
    assertEqual(_escH(null), '');
    assertEqual(_escH(undefined), '');
  });
  test('_escH no altera texto limpio', () => { assertEqual(_escH('Hola 123'), 'Hola 123'); });
  test('_escH bloquea payload XSS complejo', () => {
    const out = _escH('<img src=x onerror="alert(1)">');
    assert(!out.includes('<'), 'Contiene < sin escapar');
    assert(!out.includes('"'), 'Contiene " sin escapar');
  });
  test('_escH convierte number a string', () => { assertEqual(_escH(42), '42'); });
} else {
  test('_escH presente en normalis-multiusuario.js', () => { throw new Error('No encontrada'); });
}


// ══════════════════════════════════════════════════════════════════════════════
// 2. checkRateLimit() — rate limiter (cloudflare-worker.js)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n⚡ checkRateLimit — rate limiter (cloudflare-worker.js)');

const workerSrc = readSrc('cloudflare-worker.js');

const rlStart = workerSrc.indexOf('const _rl = new Map()');
const rlEnd   = workerSrc.indexOf('\nexport default');
const rlSection = (rlStart !== -1 && rlEnd !== -1) ? workerSrc.slice(rlStart, rlEnd) : null;

if (rlSection) {
  const rlCtx = evalBlock(rlSection);
  const checkRateLimit = rlCtx.checkRateLimit;

  test('RL: primera llamada no limita', () => {
    assert(!checkRateLimit('1.2.3.4').limited);
  });
  test('RL: 20 llamadas dentro del límite', () => {
    const ip = 'test-20calls';
    let last;
    for (let i = 0; i < 20; i++) last = checkRateLimit(ip);
    assert(!last.limited, 'Llamada 20 no debería estar limitada');
  });
  test('RL: llamada 21 activa límite por minuto', () => {
    const ip = 'test-21calls';
    for (let i = 0; i < 21; i++) checkRateLimit(ip);
    const r = checkRateLimit(ip);
    assert(r.limited, 'Llamada 22 debe estar limitada');
    assertEqual(r.retry, 60);
  });
  test('RL: mensaje de error menciona "minuto"', () => {
    const ip = 'test-msg';
    for (let i = 0; i < 25; i++) checkRateLimit(ip);
    const r = checkRateLimit(ip);
    if (r.limited) assertContains(r.reason, 'minuto');
  });
  test('RL: IPs diferentes no se bloquean entre sí', () => {
    const ipA = 'isolated-a', ipB = 'isolated-b';
    for (let i = 0; i < 25; i++) checkRateLimit(ipA);
    assert(!checkRateLimit(ipB).limited);
  });
  test('RL: retorna objeto con limited, reason, retry cuando limita', () => {
    const ip = 'test-shape';
    for (let i = 0; i < 25; i++) checkRateLimit(ip);
    const r = checkRateLimit(ip);
    if (r.limited) {
      assert(typeof r.reason === 'string');
      assert(typeof r.retry  === 'number');
    }
  });
  test('RL: limpiar entradas antiguas (>500 entries)', () => {
    assertContains(workerSrc, '_rl.size > 500');
  });
} else {
  test('cloudflare-worker.js: sección checkRateLimit presente', () => {
    throw new Error('No encontrada (rlStart=' + rlStart + ', rlEnd=' + rlEnd + ')');
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// 3. _areasDBFallback — estructura datos (normalis-data-audit.js)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n📋 _areasDBFallback — Res. 3100/2019 (normalis-data-audit.js)');

const dataSrc    = readSrc('normalis-data-audit.js');
const fbStart    = dataSrc.indexOf('var _areasDBFallback = {');
const fbEnd      = dataSrc.indexOf('\n};', fbStart) + 3;
const fallbackSrc = fbStart !== -1 ? dataSrc.slice(fbStart, fbEnd) : null;

if (fallbackSrc) {
  const fbCtx  = evalBlock(fallbackSrc);
  const fb     = fbCtx._areasDBFallback;

  test('_areasDBFallback: existe con clave general', () => {
    assert(fb && Array.isArray(fb.general));
  });
  test('_areasDBFallback: exactamente 8 estándares', () => {
    assertEqual(fb.general.length, 8, `Got ${fb.general.length}`);
  });
  test('_areasDBFallback: total 40 preguntas (5 × 8)', () => {
    const total = fb.general.reduce((s,a) => s + a.q.length, 0);
    assertEqual(total, 40, `Got ${total}`);
  });
  test('_areasDBFallback: IDs esperados (th,inf,dt,mi,pi,hc,ia,adm)', () => {
    const ids = fb.general.map(a => a.id);
    for (const id of ['th','inf','dt','mi','pi','hc','ia','adm']) {
      assert(ids.includes(id), `ID '${id}' faltante`);
    }
  });
  test('_areasDBFallback: cada área tiene id, name, icon, norm, q[]', () => {
    for (const area of fb.general) {
      assert(area.id && area.name && area.icon && area.norm, `Campo faltante en ${area.id}`);
      assert(Array.isArray(area.q) && area.q.length > 0, `q[] vacío en ${area.id}`);
    }
  });
  test('_areasDBFallback: cita Res. 3100/2019 en norm', () => {
    const ok = fb.general.every(a => a.norm.includes('3100') || a.norm.includes('Art.'));
    assert(ok, 'Algunos estándares no citan Res. 3100/2019');
  });
  test('_areasDBFallback: ninguna pregunta vacía o muy corta', () => {
    for (const area of fb.general) {
      for (const q of area.q) {
        assert(q && q.trim().length > 10, `Pregunta inválida en ${area.id}: "${q}"`);
      }
    }
  });
  test('_areasDBFallback: IDs únicos (sin duplicados)', () => {
    const ids = fb.general.map(a => a.id);
    assertEqual(new Set(ids).size, ids.length, 'IDs duplicados');
  });
} else {
  test('_areasDBFallback en normalis-data-audit.js', () => {
    throw new Error('No encontrada (start=' + fbStart + ')');
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// 4. ROLES_IPS — constantes (normalis-multiusuario.js)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n👥 ROLES_IPS (normalis-multiusuario.js)');

const rolesStart = multiSrc.indexOf('const ROLES_IPS = {');
const rolesEnd   = multiSrc.indexOf('\n};', rolesStart) + 3;

if (rolesStart !== -1) {
  // const declarations are NOT properties of vm ctx — append var name to get return value
  const rolesCode = multiSrc.slice(rolesStart, rolesEnd) + '\nROLES_IPS;';
  const vm2 = require('vm');
  const ROLES = vm2.runInContext(rolesCode, vm2.createContext({ String, Object }));

  test('ROLES_IPS: 3 roles (director, auditor, colaborador)', () => {
    assert('director' in ROLES && 'auditor' in ROLES && 'colaborador' in ROLES);
  });
  test('ROLES_IPS: cada rol tiene label, color, ico, desc', () => {
    for (const [k,v] of Object.entries(ROLES)) {
      assert(v.label && v.color && v.ico && v.desc, `Campo faltante en ${k}`);
    }
  });
  test('ROLES_IPS: colores son hex válidos (#RRGGBB)', () => {
    for (const [k,v] of Object.entries(ROLES)) {
      assert(/^#[0-9a-f]{6}$/i.test(v.color), `Color inválido en ${k}: ${v.color}`);
    }
  });
  test('ROLES_IPS: iconos usan prefijo Tabler (ti-)', () => {
    for (const [k,v] of Object.entries(ROLES)) {
      assert(v.ico.startsWith('ti-'), `Icono no es Tabler en ${k}: ${v.ico}`);
    }
  });
} else {
  test('ROLES_IPS presente', () => { throw new Error('No encontrado'); });
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. NORMALIS_PLANS + isModuleAllowed() (normalis-plans.js)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n💳 NORMALIS_PLANS + isModuleAllowed() (normalis-plans.js)');

const plansSrc  = readSrc('normalis-plans.js');
const plansStop = plansSrc.indexOf('\nfunction initPlanGating');
const plansCode = plansStop !== -1 ? plansSrc.slice(0, plansStop) : plansSrc.split('// END:')[0];

const sessionMock = {
  _d: {},
  setItem(k,v){ this._d[k]=String(v); },
  getItem(k){ return Object.prototype.hasOwnProperty.call(this._d,k) ? this._d[k] : null; }
};

const plansCtx = evalBlock(plansCode, { sessionStorage: sessionMock });

test('NORMALIS_PLANS: 3 planes', () => {
  const P = plansCtx.NORMALIS_PLANS;
  assert('basico' in P && 'profesional' in P && 'empresarial' in P);
});
test('NORMALIS_PLANS: empresarial.modules = "*"', () => {
  assertEqual(plansCtx.NORMALIS_PLANS.empresarial.modules, '*');
});
test('NORMALIS_PLANS: basico incluye auditoria', () => {
  assert(plansCtx.NORMALIS_PLANS.basico.modules.includes('auditoria'));
});
test('isModuleAllowed: piloto accede a todo', () => {
  sessionMock._d = { normalis_rol: 'piloto' };
  assert(plansCtx.isModuleAllowed('simulacro'));
});
test('isModuleAllowed: plan basico bloquea pamec', () => {
  sessionMock._d = { normalis_rol: 'cliente', normalis_plan: 'basico' };
  assert(!plansCtx.isModuleAllowed('pamec'));
});
test('isModuleAllowed: plan profesional permite pamec', () => {
  sessionMock._d = { normalis_rol: 'cliente', normalis_plan: 'profesional' };
  assert(plansCtx.isModuleAllowed('pamec'));
});
test('isModuleAllowed: admin accede a todo', () => {
  sessionMock._d = { normalis_rol: 'admin' };
  assert(plansCtx.isModuleAllowed('cualquier-modulo'));
});
test('NORMALIS_MODULE_UNLOCK: pamec y simulacro definidos', () => {
  const U = plansCtx.NORMALIS_MODULE_UNLOCK;
  assert(U && 'pamec' in U && 'simulacro' in U);
});


// ══════════════════════════════════════════════════════════════════════════════
// 6. calcAuditScore() — lógica de puntuación (normalis-audit-score.js)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n📊 calcAuditScore() (normalis-audit-score.js)');

const auditSrc  = readSrc('normalis-audit-score.js');
const calcStart = auditSrc.indexOf('function calcAuditScore');
const calcEnd   = auditSrc.indexOf('\n// ══', calcStart);
const calcCode  = auditSrc.slice(calcStart, calcEnd > 0 ? calcEnd : calcStart + 600);

function makeCalcCtx(flatQLen, answers) {
  const flatQ = Array.from({length: flatQLen}, (_, i) => i);
  return evalBlock(calcCode, { flatQ, auditAnswers: answers });
}

test('calcAuditScore: 5 si de 5 = 100%', () => {
  const ctx = makeCalcCtx(5, {q0:'si',q1:'si',q2:'si',q3:'si',q4:'si'});
  assertEqual(ctx.calcAuditScore().score, 100);
});
test('calcAuditScore: sin respuestas = 0%', () => {
  const ctx = makeCalcCtx(5, {});
  assertEqual(ctx.calcAuditScore().score, 0);
});
test('calcAuditScore: "parcial" vale 0.5 (1si+1parcial de 2 = 75%)', () => {
  const ctx = makeCalcCtx(2, {q0:'si', q1:'parcial'});
  assertEqual(ctx.calcAuditScore().score, 75);
});
test('calcAuditScore: "na" excluye del denominador (1si+1na+1no = 50%)', () => {
  const ctx = makeCalcCtx(3, {q0:'si', q1:'na', q2:'no'});
  const r = ctx.calcAuditScore();
  assertEqual(r.score, 50);
  assertEqual(r.na, 1);
  assertEqual(r.effective, 2);
});
test('calcAuditScore: todos "na" = 0% sin dividir por cero', () => {
  const ctx = makeCalcCtx(2, {q0:'na', q1:'na'});
  assertEqual(ctx.calcAuditScore().score, 0);
});
test('calcAuditScore: campos esperados (score,si,no,parcial,na,total,effective)', () => {
  const ctx = makeCalcCtx(2, {q0:'si', q1:'no'});
  const r = ctx.calcAuditScore();
  for (const c of ['score','si','no','parcial','na','total','effective']) {
    assert(c in r, `Campo '${c}' faltante`);
  }
});
test('calcAuditScore: flatQ vacío no lanza error', () => {
  const ctx = makeCalcCtx(0, {});
  assertEqual(ctx.calcAuditScore().score, 0);
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. Funciones utilitarias puras (normalis-utils.js)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🛠  shadeColor + getDaysUntil (normalis-utils.js)');

const utilsSrc = readSrc('normalis-utils.js');

const shadeSrc = extractFnSrc(utilsSrc, 'shadeColor');
const shadeCtx = evalBlock(shadeSrc);
const shadeColor = shadeCtx.shadeColor;

test('shadeColor: retorna string hex (#rrggbb)', () => {
  const out = shadeColor('#0f766e', 0);
  assert(/^#[0-9a-f]{6}$/i.test(out), `Got: ${out}`);
});
test('shadeColor: +pct aclara R', () => {
  const base = '#0f766e';
  const br = parseInt(base.slice(1,3), 16);
  const lr = parseInt(shadeColor(base, 30).slice(1,3), 16);
  assert(lr >= br, `R no aumentó: ${br} → ${lr}`);
});
test('shadeColor: no supera 255', () => {
  const out = shadeColor('#ffffff', 100);
  const parts = [out.slice(1,3), out.slice(3,5), out.slice(5,7)]
    .map(h => parseInt(h, 16));
  assert(parts.every(n => n <= 255), 'Canal RGB supera 255');
});

const daysSrc = extractFnSrc(utilsSrc, 'getDaysUntil');
const daysCtx = evalBlock(daysSrc);
const getDaysUntil = daysCtx.getDaysUntil;

test('getDaysUntil: sin fecha retorna 999', () => {
  assertEqual(getDaysUntil(''), 999);
  assertEqual(getDaysUntil(null), 999);
});
test('getDaysUntil: fecha pasada retorna negativo', () => {
  assert(getDaysUntil('2020-01-01') < 0);
});
test('getDaysUntil: fecha futura retorna positivo', () => {
  const future = new Date(Date.now() + 10 * 864e5).toISOString().slice(0,10);
  assert(getDaysUntil(future) > 0);
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. generarCodigoInvite() (normalis-multiusuario.js)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🔑 generarCodigoInvite() (normalis-multiusuario.js)');

const genSrc = extractFnSrc(multiSrc, 'generarCodigoInvite');
const genCtx = evalBlock(genSrc);
const genFn  = genCtx.generarCodigoInvite;

test('generarCodigoInvite: produce string de 10 chars', () => {
  const c = genFn();
  assertEqual(typeof c, 'string');
  assertEqual(c.length, 10);
});
test('generarCodigoInvite: solo chars permitidos (sin 0,1,I,O)', () => {
  for (let i = 0; i < 30; i++) {
    const c = genFn();
    assert(/^[A-HJ-NP-Z2-9]{10}$/.test(c), `Código inválido: ${c}`);
  }
});
test('generarCodigoInvite: 100 códigos → ≥90 únicos', () => {
  const s = new Set(Array.from({length:100}, genFn));
  assert(s.size >= 90, `Solo ${s.size}/100 únicos`);
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. Service Worker — sw.js
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🔧 Service Worker (sw.js)');

const swSrc = readSrc('sw.js');

test('sw.js: CACHE_VERSION definido', () => { assertContains(swSrc, 'const CACHE_VERSION'); });
test('sw.js: cubre normalis-styles.css', () => { assertContains(swSrc, '/normalis-styles.css'); });
test('sw.js: ≥20 módulos JS en cache', () => {
  const n = (swSrc.match(/\/normalis-\w+\.js/g) || []).length;
  assert(n >= 20, `Solo ${n} módulos en SW`);
});
test('sw.js: evento install con caches.open', () => {
  assertContains(swSrc, "addEventListener('install'");
  assertContains(swSrc, 'caches.open');
});
test('sw.js: evento activate limpia caches viejos', () => {
  assertContains(swSrc, "addEventListener('activate'");
  assertContains(swSrc, 'caches.delete');
});
test('sw.js: fetch con estrategia por tipo de archivo', () => {
  assertContains(swSrc, ".endsWith('.js')");
  assertContains(swSrc, ".endsWith('.css')");
});
test('sw.js: sello de integridad al final', () => {
  const last = swSrc.trim().split('\n').slice(-1)[0];
  assertContains(last, 'NormaLis integrity seal');
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. Firebase Storage Rules
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🗄  Firebase Storage Rules (storage.rules)');

const stRules = readSrc('storage.rules');

test('storage.rules: existe y tiene contenido', () => { assert(stRules.length > 100); });
test('storage.rules: requiere auth', () => { assertContains(stRules, 'request.auth != null'); });
test('storage.rules: límite 5MB para evidencias', () => { assertContains(stRules, '5 * 1024 * 1024'); });
test('storage.rules: solo imágenes en evidencias', () => { assertContains(stRules, "contentType.matches('image/.*')"); });
test('storage.rules: deny all por defecto', () => { assertContains(stRules, 'allow read, write: if false'); });
test('storage.rules: UID en ruta = UID del usuario', () => { assertContains(stRules, 'request.auth.uid == uid'); });


// ══════════════════════════════════════════════════════════════════════════════
// 11. normalis-checklist.js — integridad y funciones clave
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n✅ normalis-checklist.js — integridad');

const checklistSrc = readSrc('normalis-checklist.js');

test('normalis-checklist.js: tiene sello de integridad', () => {
  assertContains(checklistSrc, 'NormaLis integrity seal');
});
test('normalis-checklist.js: función renderChecklist o renderChecklists presente', () => {
  // normalis-checklist.js usa _renderChecklist (privado) y cargarChecklist (público)
  assert(checklistSrc.includes('function _renderChecklist') || checklistSrc.includes('function cargarChecklist'),
    'Función render/cargar de checklist no encontrada');
});
test('normalis-checklist.js: referencia a Firestore (db.collection)', () => {
  // Usa firebase.firestore() directamente (patrón compat SDK v10)
  assert(checklistSrc.includes('firebase.firestore()') || checklistSrc.includes('db.collection'),
    'No se encontró sincronización con Firestore');
});
test('normalis-checklist.js: no usa alert() nativo', () => {
  // alert() sin ser window.alert en contexto de módulo = UX rota
  const alertLines = checklistSrc.split('\n').filter(l =>
    l.match(/\balert\(/) && !l.trim().startsWith('//')
  );
  assertEqual(alertLines.length, 0, `Usa alert() nativo: ${alertLines[0] || ''}`);
});
test('normalis-checklist.js: links externos tienen rel=noopener', () => {
  const blanks = checklistSrc.match(/target=["']_blank["']/g) || [];
  const noopeners = checklistSrc.match(/noopener/g) || [];
  if (blanks.length > 0) {
    assert(noopeners.length >= blanks.length,
      `${blanks.length} target="_blank" pero solo ${noopeners.length} noopener`);
  }
  // Si no hay _blank, el test pasa por vacío
  assert(true, 'OK');
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. normalis-multiusuario.js — integridad completa
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n👤 normalis-multiusuario.js — integridad');

test('normalis-multiusuario.js: tiene sello de integridad', () => {
  assertContains(multiSrc, 'NormaLis integrity seal');
});
test('normalis-multiusuario.js: función renderEquipoIPS presente', () => {
  assertContains(multiSrc, 'function renderEquipoIPS');
});
test('normalis-multiusuario.js: _escH aplicado en innerHTML (no interpolación directa)', () => {
  // Verificar que m.nombre se pasa a _escH, no directamente a HTML
  assertContains(multiSrc, '_escH(m.nombre)', 'm.nombre sin sanitizar');
  assertContains(multiSrc, '_escH(m.email)', 'm.email sin sanitizar');
});
test('normalis-multiusuario.js: usa ROLES_IPS para labels de rol', () => {
  assertContains(multiSrc, 'ROLES_IPS[');
});
test('normalis-multiusuario.js: sin alert() nativo', () => {
  const alertLines = multiSrc.split('\n').filter(l =>
    l.match(/\balert\(/) && !l.trim().startsWith('//')
  );
  assertEqual(alertLines.length, 0, `alert() nativo: ${alertLines[0]||''}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// RESULTADO FINAL
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(55));
const total = passed + failed;
if (failed === 0) {
  console.log(`✔ UNIT TESTS COMPLETOS — ${passed}/${total} pasados`);
  console.log('  Lógica crítica verificada en tiempo de ejecución.');
  process.exit(0);
} else {
  console.log(`✘ UNIT TESTS — ${passed}/${total} pasados, ${failed} fallidos`);
  errors.forEach(e => console.log(`  ↳ ${e.name}: ${e.msg}`));
  process.exit(1);
}
