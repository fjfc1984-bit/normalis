/**
 * NormaLis — Smoke Tests
 * Suite de tests sin dependencias externas (Node.js puro, sin Playwright).
 * Verifica estructura HTML, referencias JS, integridad de módulos y lógica crítica.
 *
 * Ejecutar: node tests/smoke.test.js
 * En CI: .github/workflows/smoke-tests.yml
 */

const fs   = require('fs');
const path = require('path');

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
  if (!cond) throw new Error(msg);
}

function readFile(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function fileExists(rel) {
  return fs.existsSync(path.join(__dirname, '..', rel));
}

// ─── 1. Existencia de archivos críticos ────────────────────────────────────────
console.log('\n📁 Archivos críticos');

const criticalFiles = [
  'index.html', 'login.html', 'registro.html', 'admin.html',
  'normativa-app-v2.html', 'normalis-styles.css',
  'normalis-data-audit.js', 'normalis-chat.js', 'normalis-audit-score.js',
  'normalis-docs.js', 'normalis-pdf.js', 'normalis-capa.js',
  'normalis-indicadores.js', 'normalis-pqrs.js', 'normalis-incidentes.js',
  'normalis-vencimientos.js', 'normalis-simulacro.js', 'normalis-bitacora.js',
  'normalis-firestore.js', 'normalis-utils.js', 'normalis-auth.js',
  'normalis-tour.js', 'normalis-sst.js', 'normalis-pamec.js',
  'normalis-plans.js', 'normalis-export.js',
  'firestore.rules', 'normalis-validate.sh',
];

for (const f of criticalFiles) {
  test(`existe ${f}`, () => {
    assert(fileExists(f), `Archivo no encontrado: ${f}`);
    const size = fs.statSync(path.join(__dirname, '..', f)).size;
    assert(size > 500, `${f} está vacío o truncado (${size} bytes)`);
  });
}

// ─── 2. Sellos de integridad en módulos JS ─────────────────────────────────────
console.log('\n🔏 Sellos de integridad');

const jsModules = [
  'normalis-styles.css',
  'normalis-chat.js', 'normalis-audit-score.js', 'normalis-pdf.js',
  'normalis-capa.js', 'normalis-indicadores.js', 'normalis-pqrs.js',
  'normalis-incidentes.js', 'normalis-vencimientos.js', 'normalis-simulacro.js',
  'normalis-bitacora.js', 'normalis-utils.js', 'normalis-auth.js',
  'normalis-tour.js', 'normalis-sst.js', 'normalis-plans.js',
];

for (const f of jsModules) {
  test(`sello de integridad — ${f}`, () => {
    const content = readFile(f);
    const basename = path.basename(f);
    assert(
      content.includes(`END:${basename}`) || content.includes(`NormaLis integrity seal`),
      `Sello de integridad faltante en ${f}`
    );
  });
}

// ─── 3. normativa-app-v2.html — integridad estructural ─────────────────────────
console.log('\n🏗️  normativa-app-v2.html');

const app = readFile('normativa-app-v2.html');
const appLines = app.split('\n').length;

test('líneas > 8500', () => {
  assert(appLines > 8500, `Solo ${appLines} líneas — posible truncamiento`);
});

test('cierra con </html>', () => {
  const tail = app.slice(-200).trim();
  assert(tail.endsWith('</html>'), 'No termina con </html>');
});

test('cierra con </body>', () => {
  assert(app.includes('</body>'), 'Falta </body>');
});

test('referencia normalis-firestore.js', () => {
  assert(app.includes('normalis-firestore.js'), 'Falta script normalis-firestore.js');
});

test('referencia normalis-utils.js', () => {
  assert(app.includes('normalis-utils.js'), 'Falta script normalis-utils.js');
});

test('referencia normalis-data-audit.js', () => {
  assert(app.includes('normalis-data-audit.js'), 'Falta script normalis-data-audit.js');
});

test('tiene función nav()', () => {
  assert(app.includes('function nav('), 'Falta función nav()');
});

test('tiene función renderDashboard', () => {
  assert(app.includes('function renderDashboard'), 'Falta función renderDashboard');
});

test('tiene nlLazyLoad (lazy loader)', () => {
  assert(app.includes('function nlLazyLoad'), 'Falta sistema de lazy loading');
});

test('SST/PAMEC/DOCS son lazy (no <script src> directo)', () => {
  // Deben estar como comentarios, no como script tags activos
  assert(!app.includes('<script src="normalis-sst.js'), 'normalis-sst.js NO debe cargarse síncronamente');
  assert(!app.includes('<script src="normalis-pamec.js'), 'normalis-pamec.js NO debe cargarse síncronamente');
});

test('tiene barra de progreso nl-page-loader', () => {
  assert(app.includes('nl-page-loader'), 'Falta barra de carga nl-page-loader');
});

test('tiene #toast-container', () => {
  assert(app.includes('toast-container'), 'Falta #toast-container');
});

test('tiene #connection-badge', () => {
  assert(app.includes('connection-badge'), 'Falta #connection-badge para estado offline');
});

test('no usa confirm() nativo (usa nlConfirm)', () => {
  // Permitir solo en comentarios o strings, no como llamada directa
  const confirmCalls = (app.match(/\bconfirm\s*\(/g) || []).length;
  assert(confirmCalls === 0, `${confirmCalls} usos de confirm() nativo encontrados`);
});

test('no usa alert() nativo en inline script', () => {
  // Buscar alert( fuera de strings y comentarios — heurístico conservador
  // Solo contar en el bloque <script> inline principal
  const inlineScript = app.split('<script>').slice(-1)[0];
  const alertCalls = (inlineScript.match(/\balert\s*\(/g) || []).length;
  assert(alertCalls === 0, `${alertCalls} usos de alert() nativo en script inline`);
});

// ─── 4. admin.html — 9 reglas ──────────────────────────────────────────────────
console.log('\n🔐 admin.html');

const admin = readFile('admin.html');

test('termina con </html>', () => {
  assert(admin.trim().endsWith('</html>'), 'admin.html no termina con </html>');
});

test('tiene showToast', () => {
  assert(admin.includes('function showToast'), 'Falta función showToast en admin.html');
});

test('rol piloto (no admin_ips)', () => {
  // El código tiene espacios: rol:             'piloto'
  assert(/rol:\s+'piloto'/.test(admin), "crearIPS debe usar rol: 'piloto'");
  assert(!admin.includes("'admin_ips'"), "admin.html NO debe usar 'admin_ips'");
});

test('sin Custom Claims (token.claims)', () => {
  assert(!admin.includes('token.claims'), 'admin.html usa Firebase Custom Claims (prohibido)');
});

test('exactamente 1 onAuthStateChanged activo (sin contar comentarios)', () => {
  // Solo contar líneas no-comentario
  const activeLine = admin.split('\n').filter(
    l => l.includes('onAuthStateChanged') && !l.trim().startsWith('//')
  );
  assert(activeLine.length === 1, `Se esperaba 1 onAuthStateChanged activo, encontrados ${activeLine.length}`);
});

test('initApp definido exactamente 1 vez', () => {
  const count = (admin.match(/function initApp/g) || []).length;
  assert(count === 1, `initApp definido ${count} veces (debe ser 1)`);
});

test('8 funciones críticas presentes', () => {
  const fns = ['doLogin','crearIPS','cargarSolicitudes','cargarLeads',
               'showToast','escucharProspectos','cargarPilotos','cargarAnalytics'];
  for (const fn of fns) {
    assert(admin.includes(`function ${fn}`), `Falta función: ${fn}`);
  }
});

// ─── 5. login.html ────────────────────────────────────────────────────────────
console.log('\n🔑 login.html');

const login = readFile('login.html');

test('redirige clientes a normativa-app-v2.html', () => {
  assert(login.includes('normativa-app-v2.html'), 'login.html no redirige a normativa-app-v2.html');
});

test('redirige admin a admin.html', () => {
  assert(login.includes('admin.html'), 'login.html no redirige a admin.html');
});

test('prefillAppData presente', () => {
  assert(login.includes('prefillAppData'), 'Falta función prefillAppData');
});

test('sets normalis_onboarding_done', () => {
  assert(login.includes('normalis_onboarding_done'), 'login.html no establece normalis_onboarding_done');
});

test('bloquea rol pendiente', () => {
  assert(login.includes("'pendiente'") || login.includes('"pendiente"'), 'login.html no maneja rol pendiente');
});

// ─── 6. registro.html ─────────────────────────────────────────────────────────
console.log('\n📝 registro.html');

const reg = readFile('registro.html');

test("asigna rol: 'pendiente'", () => {
  // El código puede tener espacios extra: rol:            'pendiente'
  assert(/rol:\s+'pendiente'/.test(reg) || reg.includes("rol:'pendiente'"),
    "registro.html no asigna rol 'pendiente'");
});

test('crea documento en colección usuarios', () => {
  assert(reg.includes("'usuarios'") || reg.includes('"usuarios"'), 'No escribe en colección usuarios');
});

// ─── 7. Firebase config consistente ──────────────────────────────────────────
console.log('\n🔥 Firebase config');

const FIREBASE_APP_ID = '1:328915530941:web:8e77246bd2e326e115b3d4';
const htmlFiles = ['index.html', 'login.html', 'registro.html', 'admin.html', 'normativa-app-v2.html'];

for (const f of htmlFiles) {
  test(`${f} tiene App ID correcto`, () => {
    const content = readFile(f);
    assert(content.includes(FIREBASE_APP_ID), `Firebase appId incorrecto o ausente en ${f}`);
  });
}

// ─── 8. normalis-firestore.js — NIT sharing ───────────────────────────────────
console.log('\n🔄 fsSync NIT sharing');

const fs_module = readFile('normalis-firestore.js');

test('fsSync tiene _nit', () => {
  assert(fs_module.includes('_nit'), 'fsSync no tiene propiedad _nit para NIT-based sharing');
});

test('getRef usa _nit como docId', () => {
  assert(fs_module.includes('_nit') && fs_module.includes('docId'),
    'getRef no usa NIT como docId de Firestore');
});

// ─── 9. normalis-plans.js — sistema de permisos ───────────────────────────────
console.log('\n💎 Sistema de planes');

const plans = readFile('normalis-plans.js');

test('define NORMALIS_PLANS (tabla de planes)', () => {
  assert(plans.includes('NORMALIS_PLANS'),
    'normalis-plans.js no define NORMALIS_PLANS');
});

test('tiene función isModuleAllowed o initPlanGating', () => {
  assert(plans.includes('isModuleAllowed') || plans.includes('initPlanGating'),
    'normalis-plans.js no tiene función de control de acceso por módulo');
});

// ─── 10. Resultados finales ────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log(`📊 Resultados: ${passed} pasados, ${failed} fallidos de ${passed + failed} total`);

if (failed > 0) {
  console.log('\n❌ Tests fallidos:');
  errors.forEach((e, i) => console.log(`  ${i+1}. ${e.name}\n     → ${e.msg}`));
  console.log('');
  process.exit(1);
} else {
  console.log('✅ Todos los tests pasaron — listo para commit\n');
  process.exit(0);
}
