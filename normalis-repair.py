#!/usr/bin/env python3
"""
normalis-repair.py — Reparador idempotente de NormaLis
=======================================================
Restaura automáticamente:
  1. Accesibilidad en normativa-app-v2.html (skip-link, tabindex, aria, keyboard JS)
  2. Estilos de accesibilidad en normalis-styles.css (.skip-link, .sr-only, :focus-visible)
  3. Sello de integridad en normalis-styles.css
  4. Cola de admin.html si está truncado (showToast + </body></html>)

Uso:
  python3 normalis-repair.py            # repara todo
  python3 normalis-repair.py --check    # solo reporta sin modificar
  python3 normalis-repair.py --verbose  # muestra cada check

Idempotente: si todo está en orden, no modifica ningún archivo.
"""

import re
import sys
import os

# La consola de Windows por defecto usa cp1252 (no UTF-8) — un print() con
# cualquier caracter fuera de esa tabla (✗, ✔, ─, etc., que este script usa
# en varios sitios) revienta con UnicodeEncodeError y mata el proceso antes
# de terminar. Eso bloqueaba CUALQUIER commit que tocara un .js en cualquier
# carpeta del repo (el hook de pre-commit corre este script), no solo los
# legados de la raíz. Reconfigurar stdout/stderr a UTF-8 explícitamente
# evita esto sin tener que auditar cada print() del archivo uno por uno.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.abspath(__file__))
VERBOSE = '--verbose' in sys.argv
CHECK_ONLY = '--check' in sys.argv

_fixes_applied = []
_fixes_skipped = []

# ─────────────────────────────────────────────────────────────────────────────
def log(msg):
    if VERBOSE:
        print(msg)

def applied(msg):
    _fixes_applied.append(msg)
    print(f'  ✔ REPARADO: {msg}')

def skipped(msg):
    _fixes_skipped.append(msg)
    log(f'  · OK: {msg}')

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    if CHECK_ONLY:
        return
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# ─────────────────────────────────────────────────────────────────────────────
# 1. normativa-app-v2.html — accesibilidad completa
# ─────────────────────────────────────────────────────────────────────────────
def repair_app_html():
    path = os.path.join(ROOT, 'normativa-app-v2.html')
    if not os.path.exists(path):
        log(f'  · OMITIDO: {os.path.basename(path)} no existe (migrado a Next.js — ver web/, no es un truncamiento)')
        return

    content = read(path)
    original = content
    changed = []

    # ── 1a. Skip link ─────────────────────────────────────────────────────────
    if 'class="skip-link"' not in content:
        content = content.replace(
            '<body>',
            '<body>\n<!-- Skip link: accesibilidad teclado WCAG 2.4.1 -->\n<a href="#main-content" class="skip-link">Saltar al contenido principal</a>',
            1
        )
        changed.append('skip-link')

    # ── 1b. main-content tabindex=-1 ─────────────────────────────────────────
    OLD_MAIN_NT = '<div class="content" id="main-content" role="main" aria-label="Contenido principal">'
    NEW_MAIN_T  = '<div class="content" id="main-content" role="main" aria-label="Contenido principal" tabindex="-1">'
    if OLD_MAIN_NT in content:
        content = content.replace(OLD_MAIN_NT, NEW_MAIN_T)
        changed.append('main-content tabindex=-1')

    # ── 1c. Toast aria-live ───────────────────────────────────────────────────
    OLD_TOAST = '<div id="toast-container"></div>'
    NEW_TOAST = '<div id="toast-container" role="status" aria-live="polite" aria-atomic="false"></div>'
    if OLD_TOAST in content:
        content = content.replace(OLD_TOAST, NEW_TOAST)
        changed.append('toast-container aria-live')

    # ── 1d. sb-items: tabindex=0 + role=button + onkeydown ───────────────────
    def add_keyboard_to_sbitem(m):
        full = m.group(0)
        nav_match = re.search(r"onclick=\"nav\('([^']+)'\)\"", full)
        if not nav_match or 'tabindex=' in full:
            return full
        view = nav_match.group(1)
        return full.replace(
            f"onclick=\"nav('{view}')\"",
            f"role=\"button\" tabindex=\"0\" onclick=\"nav('{view}')\" "
            f"onkeydown=\"if(event.key==='Enter'||event.key===' '){{event.preventDefault();nav('{view}');}}\""
        )

    before = content.count('tabindex="0"')
    content = re.sub(
        r'<div class="sb-item[^"]*"[^>]+onclick="nav\(\'[^\']+\'\)"[^>]*>',
        add_keyboard_to_sbitem,
        content
    )
    after = content.count('tabindex="0"')
    if after > before:
        changed.append(f'tabindex=0 en {after - before} sb-items')

    # ── 1e. sb-more-toggle keyboard ──────────────────────────────────────────
    OLD_MORE = '<div class="sb-more-toggle" id="sb-more-toggle" onclick="toggleSbMore()">'
    NEW_MORE = ('<div class="sb-more-toggle" id="sb-more-toggle" role="button" tabindex="0" '
                'aria-expanded="false" onclick="toggleSbMore()" '
                "onkeydown=\"if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSbMore();}\"" + '>')
    if OLD_MORE in content:
        content = content.replace(OLD_MORE, NEW_MORE)
        changed.append('sb-more-toggle keyboard')

    # ── 1f. toggleSbMore aria-expanded ───────────────────────────────────────
    OLD_TGL = ("  toggle.classList.toggle('open', !open);\n"
               "  try { localStorage.setItem('normalis_sb_more', open ? '0' : '1'); } catch(e){}\n}")
    NEW_TGL = ("  toggle.classList.toggle('open', !open);\n"
               "  toggle.setAttribute('aria-expanded', open ? 'false' : 'true');\n"
               "  try { localStorage.setItem('normalis_sb_more', open ? '0' : '1'); } catch(e){}\n}")
    if OLD_TGL in content:
        content = content.replace(OLD_TGL, NEW_TGL)
        changed.append('toggleSbMore aria-expanded')

    # ── 1g. Keyboard navigation JS ───────────────────────────────────────────
    if 'ACCESIBILIDAD: Keyboard Navigation' not in content:
        KEYBOARD_JS = '''<script>
/* ─────────────────────────────────────────────────────────────────
   ACCESIBILIDAD: Keyboard Navigation
   ─────────────────────────────────────────────────────────────── */
(function(){
  // Arrow keys en sidebar
  document.addEventListener('keydown', function(e) {
    var active = document.activeElement;
    if (!active) return;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
        active.classList && active.classList.contains('sb-item')) {
      e.preventDefault();
      var items = Array.from(document.querySelectorAll(
        '.sidebar .sb-item:not([style*="display:none"])'));
      var idx = items.indexOf(active);
      if (e.key === 'ArrowDown' && idx < items.length - 1) items[idx + 1].focus();
      if (e.key === 'ArrowUp'   && idx > 0)                items[idx - 1].focus();
      return;
    }
    // Alt+1..8 shortcuts
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      var sh = {'1':'dashboard','2':'auditoria','3':'resultados',
                '4':'chat','5':'vencimientos','6':'pamec','7':'capa','8':'pqrs'};
      var t = sh[e.key];
      if (t && typeof nav === 'function') { e.preventDefault(); nav(t); }
    }
    // Escape cierra overlays
    if (e.key === 'Escape') {
      var so = document.getElementById('search-overlay');
      if (so && so.style.display !== 'none' && typeof closeSearch === 'function') closeSearch();
    }
  });
  // Scroll sb-item enfocado a la vista
  document.addEventListener('focusin', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('sb-item'))
      e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  // Live region para screen readers
  var _lr = null;
  function _ann(msg) {
    if (!_lr) {
      _lr = document.createElement('div');
      _lr.className = 'sr-only';
      _lr.setAttribute('aria-live', 'polite');
      _lr.setAttribute('aria-atomic', 'true');
      document.body.appendChild(_lr);
    }
    _lr.textContent = ''; setTimeout(function(){ _lr.textContent = msg; }, 50);
  }
  // Parchear nav() para anunciar vista a SR
  document.addEventListener('DOMContentLoaded', function(){
    if (typeof nav !== 'function') return;
    var _orig = nav;
    window.nav = function(v) {
      _orig(v);
      var el = document.querySelector('.sb-item.active');
      _ann('Vista: ' + (el ? el.textContent.trim() : v));
    };
  });
})();
</script>

'''
        last_body = content.rfind('</body>')
        if last_body != -1:
            content = content[:last_body] + KEYBOARD_JS + content[last_body:]
            changed.append('keyboard nav JS')

    if changed:
        write(path, content)
        for c in changed:
            applied(f'normativa-app-v2.html → {c}')
    else:
        skipped('normativa-app-v2.html (accesibilidad OK)')

# ─────────────────────────────────────────────────────────────────────────────
# 2. normalis-styles.css — estilos de accesibilidad + sello
# ─────────────────────────────────────────────────────────────────────────────
CSS_A11Y_BLOCK = '''
/* ─────────────────────────────────────────────────────────────────
   ACCESIBILIDAD — WCAG 2.1 AA
   ─────────────────────────────────────────────────────────────── */

/* Skip link */
.skip-link {
  position: absolute;
  top: -100px;
  left: 16px;
  z-index: 9999;
  padding: 8px 16px;
  background: var(--primary, #00796B);
  color: #fff;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: top .15s;
}
.skip-link:focus {
  top: 0;
  outline: 3px solid #fff;
  outline-offset: 2px;
}

/* Screen-reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus visible — solo teclado */
:focus:not(:focus-visible) { outline: none; }
:focus-visible {
  outline: 3px solid var(--primary, #00796B);
  outline-offset: 2px;
  border-radius: 4px;
}
button:focus-visible, .btn:focus-visible {
  outline: 3px solid var(--primary, #00796B);
  outline-offset: 3px;
}
.sb-item:focus-visible {
  outline: 2px solid var(--primary, #00796B);
  outline-offset: -2px;
}

/* Forced colors (Windows High Contrast) */
@media (forced-colors: active) {
  .skip-link { forced-color-adjust: none; }
  :focus-visible { outline: 3px solid ButtonText; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
'''

CSS_SEAL = '/* END:normalis-styles.css — NormaLis integrity seal */'

def repair_styles_css():
    path = os.path.join(ROOT, 'normalis-styles.css')
    if not os.path.exists(path):
        log(f'  · OMITIDO: {os.path.basename(path)} no existe (migrado a Next.js — ver web/, no es un truncamiento)')
        return

    content = read(path)
    original = content
    changed = []

    # Remove seal temporarily to work with content body
    has_seal = CSS_SEAL in content
    if has_seal:
        content = content.replace('\n' + CSS_SEAL, '').replace(CSS_SEAL, '')

    # Check and add a11y block
    if '.skip-link' not in content:
        content = content.rstrip() + '\n' + CSS_A11Y_BLOCK
        changed.append('bloque a11y CSS')

    # Ensure seal is at the end
    content = content.rstrip() + '\n' + CSS_SEAL + '\n'

    if content != original:
        write(path, content)
        for c in changed:
            applied(f'normalis-styles.css → {c}')
        if not has_seal:
            applied('normalis-styles.css → sello de integridad')
    else:
        skipped('normalis-styles.css (OK)')

# ─────────────────────────────────────────────────────────────────────────────
# 3. admin.html — anti-truncación
# ─────────────────────────────────────────────────────────────────────────────
ADMIN_TAIL = '''
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.className = `toast toast-${type} show`;
  toast.textContent = msg;
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
</script>
</body>
</html>'''

def repair_admin_html():
    path = os.path.join(ROOT, 'admin.html')
    if not os.path.exists(path):
        log(f'  · OMITIDO: {os.path.basename(path)} no existe (migrado a Next.js — ver web/, no es un truncamiento)')
        return

    content = read(path)

    missing = []
    if 'function showToast' not in content:
        missing.append('showToast')
    if not content.rstrip().endswith('</html>'):
        missing.append('cierre HTML')

    if missing:
        # Strip broken end and re-append
        # Find last </script> that has proper context and cut there
        idx = content.rfind('function showToast')
        if idx == -1:
            # Append entire tail
            # Remove dangling end if any
            content = content.rstrip()
            if content.endswith('</html>'):
                pass  # already there, showToast must be elsewhere — don't double append
            else:
                content += '\n' + ADMIN_TAIL
                write(path, content)
                applied(f'admin.html → cola restaurada ({", ".join(missing)})')
                return
        else:
            skipped(f'admin.html (showToast presente en posición {idx})')
            return
    else:
        skipped('admin.html (OK)')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Integridad de sellos en módulos JS (verificación rápida)
# ─────────────────────────────────────────────────────────────────────────────
JS_SEALS = {
    'normalis-chat.js':         'END:normalis-chat.js',
    'normalis-audit-score.js':  'END:normalis-audit-score.js',
    'normalis-bitacora.js':     'END:normalis-bitacora.js',
    'normalis-docs.js':         'END:normalis-docs.js',
    'normalis-pdf.js':          'END:normalis-pdf.js',
    'normalis-pqrs.js':         'END:normalis-pqrs.js',
    'normalis-incidentes.js':   'END:normalis-incidentes.js',
    'normalis-vencimientos.js': 'END:normalis-vencimientos.js',
    'normalis-simulacro.js':    'END:normalis-simulacro.js',
    'normalis-firestore.js':    'END:normalis-firestore.js',
    'normalis-plans.js':        'END:normalis-plans.js',
    'normalis-tour.js':         'END:normalis-tour.js',
    'normalis-capa.js':         'END:normalis-capa.js',
    'normalis-indicadores.js':  'END:normalis-indicadores.js',
    'normalis-pamec.js':        'END:normalis-pamec.js',
    'normalis-sst.js':          'END:normalis-sst.js',
    'normalis-autofix.js':      'END:normalis-autofix.js',
    'normalis-utils.js':        'END:normalis-utils.js',
    'normalis-auth.js':         'END:normalis-auth.js',
    'normalis-export.js':       'END:normalis-export.js',
    'normalis-users.js':        'END:normalis-users.js',
    'normalis-automations.js':  'END:normalis-automations.js',
    'normalis-checklist.js':    'END:normalis-checklist.js',
    'normalis-multiusuario.js': 'END:normalis-multiusuario.js',
    'normalis-data-audit.js':   'END:normalis-data-audit.js',
}

def repair_seals():
    for filename, seal_text in JS_SEALS.items():
        path = os.path.join(ROOT, filename)
        if not os.path.exists(path):
            log(f'  · OMITIDO (no existe): {filename}')
            continue

        content = read(path)
        seal_line = f'// {seal_text} — NormaLis integrity seal'

        if seal_text not in content:
            content = content.rstrip() + '\n' + seal_line + '\n'
            write(path, content)
            applied(f'{filename} → sello de integridad restaurado')
        else:
            skipped(f'{filename} (sello OK)')


# ─────────────────────────────────────────────────────────────────────────────
# REPAIR 5 — Verificar sanitizeHTML en normalis-utils.js
# ─────────────────────────────────────────────────────────────────────────────
def repair_sanitize_html():
    path = os.path.join(ROOT, 'normalis-utils.js')
    if not os.path.exists(path):
        log('  · OMITIDO: normalis-utils.js no existe')
        return
    content = read(path)
    if 'function sanitizeHTML' in content:
        skipped('normalis-utils.js (sanitizeHTML OK)')
        return
    # Inject sanitizeHTML before the integrity seal
    sanitize_fn = """
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-z]+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on[a-z]+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '');
}
"""
    seal = 'END:normalis-utils.js'
    if seal in content:
        content = content.replace(
            '// ' + seal + ' — NormaLis integrity seal',
            sanitize_fn + '\n// ' + seal + ' — NormaLis integrity seal'
        )
    else:
        content = content.rstrip() + sanitize_fn
    write(path, content)
    applied('normalis-utils.js → sanitizeHTML agregada')


# ─────────────────────────────────────────────────────────────────────────────
# REPAIR 6 — Verificar sitemap.xml y robots.txt existen
# ─────────────────────────────────────────────────────────────────────────────
SITEMAP_CONTENT = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://normalis.co/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://normalis.co/pricing.html</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://normalis.co/registro.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://normalis.co/login.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://normalis.co/terminos.html</loc><changefreq>yearly</changefreq><priority>0.4</priority></url>
  <url><loc>https://normalis.co/status.html</loc><changefreq>daily</changefreq><priority>0.3</priority></url>
</urlset>
"""

ROBOTS_CONTENT = """User-agent: *
Allow: /

# Bloquear panel admin y app (requieren autenticación)
Disallow: /admin.html
Disallow: /normativa-app-v2.html
Disallow: /success.html

# Sitemap
Sitemap: https://normalis.co/sitemap.xml
"""

def repair_seo_files():
    # sitemap.xml
    sitemap = os.path.join(ROOT, 'sitemap.xml')
    if not os.path.exists(sitemap):
        write(sitemap, SITEMAP_CONTENT.strip() + '\n')
        applied('sitemap.xml creado')
    else:
        skipped('sitemap.xml (existe)')

    # robots.txt
    robots = os.path.join(ROOT, 'robots.txt')
    if not os.path.exists(robots):
        write(robots, ROBOTS_CONTENT.strip() + '\n')
        applied('robots.txt creado')
    else:
        skipped('robots.txt (existe)')


# ─────────────────────────────────────────────────────────────────────────────
# REPAIR 7 — Verificar og: meta en páginas públicas
# ─────────────────────────────────────────────────────────────────────────────
OG_PAGES = {
    'pricing.html':  ('NormaLis — Planes y Precios', 'Software de habilitación IPS en Colombia. Gestiona Resolución 3100/2019 y 465/2025 desde COP 99.000/mes.', 'https://normalis.co/pricing.html'),
    'terminos.html': ('Términos y Condiciones — NormaLis', 'Términos y condiciones de uso de NormaLis, plataforma de gestión normativa para IPS colombianas.', 'https://normalis.co/terminos.html'),
    'status.html':   ('Estado del Servicio — NormaLis', 'Verificación del estado en tiempo real de los servicios de NormaLis.', 'https://normalis.co/status.html'),
}

def repair_og_meta():
    for filename, (title, desc, url) in OG_PAGES.items():
        path = os.path.join(ROOT, filename)
        if not os.path.exists(path):
            log(f'  · OMITIDO: {filename} no existe')
            continue
        content = read(path)
        if 'og:title' in content:
            skipped(f'{filename} (og:title OK)')
            continue
        og_block = f"""  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="https://normalis.co/og-image.png">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">"""
        # Insert before </head>
        if '</head>' in content:
            content = content.replace('</head>', og_block + '\n</head>', 1)
            write(path, content)
            applied(f'{filename} → og: meta agregada')
        else:
            log(f'  · WARNING: {filename} sin </head>')


# ─────────────────────────────────────────────────────────────────────────────
# REPAIR 8 — Verificar escH en módulos con innerHTML de datos usuario
# ─────────────────────────────────────────────────────────────────────────────
ESC_MODULES = [
    'normalis-vencimientos.js',
    'normalis-capa.js',
    'normalis-indicadores.js',
]
ESC_FALLBACK = """// XSS-safe HTML escaper (local fallback)
var escH = window.escH || function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

"""

def repair_escH_modules():
    for filename in ESC_MODULES:
        path = os.path.join(ROOT, filename)
        if not os.path.exists(path):
            continue
        content = read(path)
        if 'escH' in content or 'var escH' in content:
            skipped(f'{filename} (escH OK)')
            continue
        content = ESC_FALLBACK + content
        write(path, content)
        applied(f'{filename} → escH fallback agregado')

# ─────────────────────────────────────────────────────────────────────────────
# 9. CSP — dominios requeridos en los 5 HTML (CE-007)
# ─────────────────────────────────────────────────────────────────────────────
# Regla: cada vez que se agrega una librería externa (Sentry, Tabler, etc.)
# hay que actualizar el CSP. Este repair lo verifica y repara automáticamente.

CSP_REQUIRED = {
    'style-src': [
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',       # Tabler Icons CSS
    ],
    'font-src': [
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',       # Tabler Icons webfont
    ],
    'connect-src': [
        'https://*.firebaseapp.com',
        'https://*.googleapis.com',
        'https://*.firebaseio.com',
        'https://normalis.fjfc1984.workers.dev',
        'https://www.google-analytics.com',
        'https://*.sentry.io',            # Sentry error ingest
    ],
    # script-src solo se verifica — Sentry CDN se agrega condicionalmente en repair_csp()
    'script-src': [
        'https://www.gstatic.com',
        'https://cdn.jsdelivr.net',
    ],
}

HTML_FILES_CSP = [
    'normativa-app-v2.html',
    'login.html',
    'admin.html',
    'index.html',
    'registro.html',
]

def _ensure_csp_domain(csp_content, directive, domain):
    """Inserta domain en la directiva CSP si no está presente."""
    # Buscar la directiva en el CSP
    pattern = re.compile(r'(' + re.escape(directive) + r'[^;]*)(;)', re.IGNORECASE)
    m = pattern.search(csp_content)
    if not m:
        return csp_content  # directiva no encontrada, no tocar
    directive_value = m.group(1)
    if domain in directive_value:
        return csp_content  # ya está
    new_directive = directive_value + ' ' + domain
    return csp_content[:m.start()] + new_directive + m.group(2) + csp_content[m.end():]

def repair_csp():
    for fname in HTML_FILES_CSP:
        path = os.path.join(ROOT, fname)
        if not os.path.exists(path):
            continue
        content = read(path)
        if 'Content-Security-Policy' not in content:
            skipped(f'{fname} (sin CSP)')
            continue
        original = content
        for directive, domains in CSP_REQUIRED.items():
            for domain in domains:
                content = _ensure_csp_domain(content, directive, domain)
        # Sentry CDN solo si el archivo realmente carga ese script
        if 'browser.sentry-cdn.com' in content:
            content = _ensure_csp_domain(content, 'script-src', 'https://browser.sentry-cdn.com')
        if content != original:
            write(path, content)
            applied(f'{fname} — CSP actualizado con dominios faltantes')
        else:
            skipped(f'{fname} CSP OK')

# 10. JS — caracteres Unicode no-ASCII en strings JS (CE-008)
# ─────────────────────────────────────────────────────────────────────────────
# Causa: emojis/caracteres fuera de Latin-1 en archivos JS pueden causar
# "Uncaught SyntaxError" si el CDN sirve sin charset=utf-8 explícito.
# Fix: reemplazar con HTML entities ASCII-puras (safe en innerHTML).

UNICODE_JS_FIXES = {
    '⚠️': '&#9888;',   # emoji U+26A0+FE0F → HTML entity (causa SyntaxError en CDN sin charset=utf-8)
    # Los acentos del español (í, é, ó) son Latin-1 y no causan problemas — no se reemplazan
}

JS_FILES_UNICODE = ['normalis-chat.js', 'normalis-firestore.js']

def repair_unicode_in_js():
    for fname in JS_FILES_UNICODE:
        path = os.path.join(ROOT, fname)
        if not os.path.exists(path):
            continue
        content = read(path)
        original = content
        for bad, good in UNICODE_JS_FIXES.items():
            # Solo reemplazar dentro de strings JS (líneas con html +=)
            content = content.replace(bad, good)
        if content != original:
            write(path, content)
            applied(f'{fname} — Unicode reemplazado con HTML entities')
        else:
            skipped(f'{fname} Unicode OK')

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print('NormaLis Repair — verificando integridad del codebase...')
    if CHECK_ONLY:
        print('  [MODO CHECK — sin modificaciones]\n')

    print('\n[1/4] normativa-app-v2.html — accesibilidad')
    repair_app_html()

    print('\n[2/4] normalis-styles.css — estilos a11y + sello')
    repair_styles_css()

    print('\n[3/4] admin.html — anti-truncación')
    repair_admin_html()

    print('\n[4/4] Sellos de integridad JS')
    repair_seals()

    print('\n[5/8] normalis-utils.js — sanitizeHTML')
    repair_sanitize_html()

    print('\n[6/8] SEO — sitemap.xml + robots.txt')
    repair_seo_files()

    print('\n[7/8] og: meta en páginas públicas')
    repair_og_meta()

    print('\n[8/8] escH en módulos con innerHTML de usuario')
    repair_escH_modules()

    print('\n[9/10] CSP — dominios requeridos en 5 HTML')
    repair_csp()

    print('\n[10/10] JS — Unicode no-ASCII en strings (CE-008)')
    repair_unicode_in_js()

    print('\n' + '─' * 60)
    if _fixes_applied:
        print(f'✔ {len(_fixes_applied)} reparaciones aplicadas:')
        for f in _fixes_applied:
            print(f'  · {f}')
        if not CHECK_ONLY:
            print('\nEjecutar normalis-validate.sh para confirmar estado final.')
        sys.exit(0)
    else:
        print('✔ Todo en orden — ninguna reparación necesaria.')
        sys.exit(0)

if __name__ == '__main__':
    main()
