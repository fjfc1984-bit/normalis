#!/usr/bin/env python3
"""
Applies the onboarding fix to login.html and normativa-app-v2.html.
Run AFTER git reset --hard origin/main so files are at origin/main state.
"""
import sys, re

BASE = r"C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis"

# ─── Fix 1: login.html ────────────────────────────────────────────────────────
# Add localStorage.setItem('normalis_onboarding_done','true') BEFORE try{prefillAppData}
# so the flag is always set even if prefillAppData throws.

LOGIN_OLD = """    if (rol !== 'admin') {
      try {
        prefillAppData(data);
      } catch (_) { /* silencioso — no bloquea el acceso */ }
    }"""

LOGIN_NEW = """    if (rol !== 'admin') {
      localStorage.setItem('normalis_onboarding_done', 'true');  // fix: siempre establecer al login
      try {
        prefillAppData(data);
      } catch (_) { /* silencioso — no bloquea el acceso */ }
    }"""

login_path = BASE + r"\login.html"
with open(login_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'normalis_onboarding_done' in content and LOGIN_OLD not in content:
    print("login.html: fix already applied or pattern changed — skipping")
elif LOGIN_OLD not in content:
    print("ERROR: login.html pattern not found — manual fix needed")
    sys.exit(1)
else:
    content = content.replace(LOGIN_OLD, LOGIN_NEW, 1)
    with open(login_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("login.html: fix applied OK")


# ─── Fix 2: normativa-app-v2.html ─────────────────────────────────────────────
# Replace the DOMContentLoaded onboarding check to also check sessionStorage.

APP_OLD = """document.addEventListener('DOMContentLoaded', function(){
  if (localStorage.getItem('normalis_onboarding_done')) {
    var ob = document.getElementById('onboarding');
    if (ob) ob.style.display = 'none';
    var appEl = document.getElementById('app');
    if (appEl) appEl.style.display = 'flex';
    if (typeof initApp === 'function') setTimeout(initApp, 50);
    return;
  }
  setTimeout(obRunStep, 300);
});"""

APP_NEW = """document.addEventListener('DOMContentLoaded', function(){
  // Saltar onboarding si ya fue completado O si hay sesion Firebase activa
  var yaHizo = localStorage.getItem('normalis_onboarding_done');
  var tieneSession = sessionStorage.getItem('normalis_uid') && sessionStorage.getItem('normalis_rol');
  if (yaHizo || tieneSession) {
    if (tieneSession && !yaHizo) localStorage.setItem('normalis_onboarding_done', 'true');
    var ob = document.getElementById('onboarding');
    if (ob) ob.style.display = 'none';
    var appEl = document.getElementById('app');
    if (appEl) appEl.style.display = 'flex';
    if (typeof initApp === 'function') setTimeout(initApp, 50);
    return;
  }
  setTimeout(obRunStep, 300);
});"""

app_path = BASE + r"\normativa-app-v2.html"
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'tieneSession' in content:
    print("normativa-app-v2.html: fix already applied — skipping")
elif APP_OLD not in content:
    print("ERROR: normativa-app-v2.html pattern not found — manual fix needed")
    sys.exit(1)
else:
    content = content.replace(APP_OLD, APP_NEW, 1)
    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("normativa-app-v2.html: fix applied OK")

print("All fixes applied successfully.")
