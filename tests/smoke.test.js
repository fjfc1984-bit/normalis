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
  'normalis-checklist.js', 'normalis-multiusuario.js',
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
  'normalis-checklist.js', 'normalis-multiusuario.js',
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
// normalis-main.js contiene el script principal extraído desde normativa-app-v2.html (Task #263)
const mainJs = readFile('normalis-main.js');
const mainLines = mainJs.split('\n').length;

test('líneas > 8500', () => {
  // normativa-app-v2.html fue reducido (script extraído a normalis-main.js)
  // normalis-main.js debe tener >5000 líneas
  assert(mainLines > 5000, `normalis-main.js solo tiene ${mainLines} líneas — posible truncamiento`);
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
  // nav() fue movido a normalis-main.js (Task #263)
  assert(mainJs.includes('function nav('), 'Falta función nav() en normalis-main.js');
});

test('tiene función renderDashboard', () => {
  // renderDashboard fue movido a normalis-main.js (Task #263)
  assert(mainJs.includes('function renderDashboard'), 'Falta función renderDashboard en normalis-main.js');
});

test('tiene nlLazyLoad (lazy loader)', () => {
  // nlLazyLoad fue movido a normalis-main.js (Task #263)
  assert(mainJs.includes('function nlLazyLoad'), 'Falta sistema de lazy loading en normalis-main.js');
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
// normativa-app-v2.html ya no tiene Firebase config inline — está en normalis-main.js (Task #263)
const htmlFiles = ['index.html', 'login.html', 'registro.html', 'admin.html'];

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
// ─── 10. normalis-checklist.js — módulo de checklist ─────────────────────────
console.log('\n✅ normalis-checklist.js');
const checklistFile = readFile('normalis-checklist.js');
test('normalis-checklist.js: contiene función cargarChecklist', () => {
  assert(checklistFile.includes('function cargarChecklist'),
    'cargarChecklist no encontrada — checklist no se puede inicializar');
});
test('normalis-checklist.js: contiene _renderChecklist', () => {
  assert(checklistFile.includes('function _renderChecklist'),
    '_renderChecklist no encontrada — render roto');
});
test('normalis-checklist.js: contiene registrarRespuestaChecklist', () => {
  assert(checklistFile.includes('function registrarRespuestaChecklist'),
    'registrarRespuestaChecklist no encontrada — guardar respuestas roto');
});
test('normalis-checklist.js: tiene sello de integridad', () => {
  assert(checklistFile.includes('NormaLis integrity seal'),
    'Sello de integridad faltante — archivo posiblemente truncado');
});
test('normalis-checklist.js: no usa alert() nativo', () => {
  const alertUse = checklistFile.split('\n').filter(l =>
    l.match(/\balert\(/) && !l.trim().startsWith('//'));
  assert(alertUse.length === 0, `alert() nativo encontrado: ${alertUse[0]||''}`);
});

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 12 — normalis-docs.js
// ═══════════════════════════════════════════════════════════════
console.log('\n12. normalis-docs.js');
const docsPath = path.join(__dirname, '..', 'normalis-docs.js');
const docsSrc  = fs.readFileSync(docsPath, 'utf8');

test('docs.js existe y no está vacío', () => assert(docsSrc.length > 10000));
test('docs.js tiene openDocViewer', () => assert(docsSrc.includes('function openDocViewer')));
test('docs.js tiene openDocPreview', () => assert(docsSrc.includes('function openDocPreview')));
test('docs.js tiene sello de integridad', () => assert(docsSrc.includes('END:normalis-docs.js')));
test('docs.js sin eval()', () => assert(!docsSrc.includes('\beval(')));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 13 — normalis-pdf.js
// ═══════════════════════════════════════════════════════════════
console.log('\n13. normalis-pdf.js');
const pdfPath = path.join(__dirname, '..', 'normalis-pdf.js');
const pdfSrc  = fs.readFileSync(pdfPath, 'utf8');

test('pdf.js existe y no está vacío', () => assert(pdfSrc.length > 5000));
test('pdf.js tiene printAuditReport', () => assert(pdfSrc.includes('function printAuditReport')));
test('pdf.js sello de integridad', () => assert(pdfSrc.includes('END:normalis-pdf.js')));
test('pdf.js no usa alert()', () => assert(!pdfSrc.match(/\balert\s*\(/)));
test('pdf.js usa window.open o print', () => assert(pdfSrc.includes('window.open') || pdfSrc.includes('.print(')));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 14 — normalis-pamec.js
// ═══════════════════════════════════════════════════════════════
console.log('\n14. normalis-pamec.js');
const pamecPath = path.join(__dirname, '..', 'normalis-pamec.js');
const pamecSrc  = fs.readFileSync(pamecPath, 'utf8');

test('pamec.js existe y no está vacío', () => assert(pamecSrc.length > 10000));
test('pamec.js sello de integridad', () => assert(pamecSrc.includes('END:normalis-pamec.js')));
test('pamec.js no usa confirm() nativo', () => assert(!pamecSrc.match(/[^a-zA-Z]confirm\s*\(/)));
test('pamec.js no usa alert() nativo', () => assert(!pamecSrc.match(/\balert\s*\(/)));
test('pamec.js tiene try/catch', () => assert(pamecSrc.includes('} catch')));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 15 — normalis-capa.js
// ═══════════════════════════════════════════════════════════════
console.log('\n15. normalis-capa.js');
const capaPath = path.join(__dirname, '..', 'normalis-capa.js');
const capaSrc  = fs.readFileSync(capaPath, 'utf8');

test('capa.js existe y no está vacío', () => assert(capaSrc.length > 5000));
test('capa.js tiene saveCAPA', () => assert(capaSrc.includes('function saveCAPA')));
test('capa.js tiene renderCAPAs', () => assert(capaSrc.includes('function renderCAPAs')));
test('capa.js sello de integridad', () => assert(capaSrc.includes('END:normalis-capa.js')));
test('capa.js no usa alert() nativo', () => assert(!capaSrc.match(/\balert\s*\(/)));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 16 — normalis-indicadores.js
// ═══════════════════════════════════════════════════════════════
console.log('\n16. normalis-indicadores.js');
const indPath = path.join(__dirname, '..', 'normalis-indicadores.js');
const indSrc  = fs.readFileSync(indPath, 'utf8');

test('indicadores.js existe y no está vacío', () => assert(indSrc.length > 5000));
test('indicadores.js tiene saveIndicador', () => assert(indSrc.includes('function saveIndicador')));
test('indicadores.js tiene renderIndicadores', () => assert(indSrc.includes('function renderIndicadores')));
test('indicadores.js tiene exportarIndicadoresPDF', () => assert(indSrc.includes('function exportarIndicadoresPDF')));
test('indicadores.js sello de integridad', () => assert(indSrc.includes('END:normalis-indicadores.js')));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 17 — normalis-tour.js
// ═══════════════════════════════════════════════════════════════
console.log('\n17. normalis-tour.js');
const tourPath = path.join(__dirname, '..', 'normalis-tour.js');
const tourSrc  = fs.readFileSync(tourPath, 'utf8');

test('tour.js existe y no está vacío', () => assert(tourSrc.length > 5000));
test('tour.js tiene startNormalisTour', () => assert(tourSrc.includes('function startNormalisTour')));
test('tour.js sello de integridad', () => assert(tourSrc.includes('END:normalis-tour.js')));
test('tour.js no usa alert() nativo', () => assert(!tourSrc.match(/\balert\s*\(/)));
test('tour.js tiene cleanup/destroy', () => assert(tourSrc.includes('destroy') || tourSrc.includes('cleanup') || tourSrc.includes('remove')));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 18 — normalis-autofix.js
// ═══════════════════════════════════════════════════════════════
console.log('\n18. normalis-autofix.js');
const autofixPath = path.join(__dirname, '..', 'normalis-autofix.js');
const autofixSrc  = fs.readFileSync(autofixPath, 'utf8');

test('autofix.js existe y no está vacío', () => assert(autofixSrc.length > 5000));
test('autofix.js sello de integridad', () => assert(autofixSrc.includes('END:normalis-autofix.js')));
test('autofix.js tiene NormalisAutofix o AUTOFIX_PATTERNS', () =>
  assert(autofixSrc.includes('NormalisAutofix') || autofixSrc.includes('AUTOFIX_PATTERNS')));
test('autofix.js no modifica window globales peligrosos', () =>
  assert(!autofixSrc.includes('window.eval') && !autofixSrc.includes('window.Function')));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 19 — normalis-bitacora.js
// ═══════════════════════════════════════════════════════════════
console.log('\n19. normalis-bitacora.js');
const bitacoraPath = path.join(__dirname, '..', 'normalis-bitacora.js');
const bitacoraSrc  = fs.readFileSync(bitacoraPath, 'utf8');

test('bitacora.js existe y no está vacío', () => assert(bitacoraSrc.length > 3000));
test('bitacora.js tiene logAction', () => assert(bitacoraSrc.includes('function logAction')));
test('bitacora.js tiene renderBitacora', () => assert(bitacoraSrc.includes('function renderBitacora')));
test('bitacora.js sello de integridad', () => assert(bitacoraSrc.includes('END:normalis-bitacora.js')));
test('bitacora.js usa escH() para prevenir XSS', () => assert(bitacoraSrc.includes('escH(')));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 20 — normalis-vencimientos.js
// ═══════════════════════════════════════════════════════════════
console.log('\n20. normalis-vencimientos.js');
const vencPath = path.join(__dirname, '..', 'normalis-vencimientos.js');
const vencSrc  = fs.readFileSync(vencPath, 'utf8');

test('vencimientos.js existe y no está vacío', () => assert(vencSrc.length > 2000));
test('vencimientos.js tiene saveVenc', () => assert(vencSrc.includes('function saveVenc')));
test('vencimientos.js tiene renderVencimientos', () => assert(vencSrc.includes('function renderVencimientos')));
test('vencimientos.js sello de integridad', () => assert(vencSrc.includes('END:normalis-vencimientos.js')));
test('vencimientos.js tiene manejo de fechas', () => assert(vencSrc.includes('Date') || vencSrc.includes('timestamp')));

// ═══════════════════════════════════════════════════════════════
// SECCIÓN 21 — normalis-sst.js
// ═══════════════════════════════════════════════════════════════
console.log('\n21. normalis-sst.js');
const sstPath = path.join(__dirname, '..', 'normalis-sst.js');
const sstSrc  = fs.readFileSync(sstPath, 'utf8');

test('sst.js existe y no está vacío', () => assert(sstSrc.length > 20000));
test('sst.js tiene renderSST', () => assert(sstSrc.includes('function renderSST')));
test('sst.js tiene calcSSTScore', () => assert(sstSrc.includes('function calcSSTScore')));
test('sst.js tiene sstGuardarActividad', () => assert(sstSrc.includes('function sstGuardarActividad')));
test('sst.js sello de integridad', () => assert(sstSrc.includes('END:normalis-sst.js')));
test('sst.js tiene try/catch en operaciones Firestore', () => assert(sstSrc.includes('} catch')));


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
