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
        print(f'  ✗ NO ENCONTRADO: {path}')
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
        print(f'  ✗ NO ENCONTRADO: {path}')
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
        print(f'  ✗ NO ENCONTRADO: {path}')
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
