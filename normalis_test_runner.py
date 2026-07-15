#!/usr/bin/env python3
"""
normalis_test_runner.py — Test suite automatizado para el chat normativo de NormaLis

USO:
    python3 normalis_test_runner.py [--proxy URL] [--apikey GEMINI_KEY] [--verbose]

EJEMPLOS:
    # Contra el proxy Firebase (producción):
    python3 normalis_test_runner.py --proxy https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy

    # Directo a Gemini (para probar sin proxy):
    python3 normalis_test_runner.py --apikey AIza...

CRITERIO DE APROBACIÓN: >= 85% de preguntas con respuesta correcta verificable.
"""

import json
import sys
import re
import argparse
import urllib.request
import urllib.error
import time

PROXY_URL   = 'https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy'
TEST_FILE   = 'normalis_test_suite.json'

# Palabras clave que DEBEN aparecer en una respuesta correcta para cada test
# (verificadas contra el texto oficial de la resolución)
RESPUESTA_KEYWORDS = {
    "T01": ["cuatro", "4", "cuatro (4)", "4 años"],
    "T02": ["un (1) año", "un año", "1 año", "cuarto año", "renovación"],
    "T03": ["inactivar", "inactivación", "inactiva", "REPS"],
    "T04": ["talento humano", "infraestructura", "dotación", "procesos prioritarios", "historia clínica", "interdependencia"],
    "T05": ["técnico-administrativa", "tecnico-administrativa", "patrimonial", "tecnológica"],
    "T06": ["gratuito", "gratuita", "gratuidad", "gratis", "sin costo"],
    "T07": ["oncológico", "urgencias", "parto", "transporte asistencial", "alta complejidad"],
    "T08": ["cuarto año", "4to año", "antes de su vencimiento", "465"],
    "T09": ["novedad", "novedades", "reportar", "secretaría de salud"],
    "T10": ["IPS", "profesionales independientes", "transporte especial", "secretar", "superintendencia"],
    "T11": ["un (1) año", "un año", "1 año", "cierre temporal"],
    "T12": ["único responsable", "responsable", "independientemente", "tercero"],
    "T13": ["intramural", "extramural", "telemedicina"],
    "T14": ["2003", "5158", "226", "1416"],
    "T15": ["posterior", "plan de visitas", "certificar", "secretaría"],
    "T16": ["consulta externa", "internación", "quirúrgico", "atención inmediata", "apoyo diagnóstico"],
    "T17": ["no pueden exigir", "no podrán exigir", "requisitos distintos", "prohibido"],
    "T18": ["465", "artículo 4", "artículo 5", "artículo 19", "artículo 20"],
    "T19": ["habilitación", "PAMEC", "acreditación", "información para la calidad"],
    "T20": ["no establece", "Ministerio de Educación", "programas académicos"],
}

def call_proxy(proxy_url, question):
    """Llama al proxy Firebase con la pregunta."""
    data = json.dumps({
        "question": question,
        "sessionHistory": []
    }).encode('utf-8')
    req = urllib.request.Request(
        proxy_url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return result.get('answer', ''), result.get('sources', [])
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        return f"[HTTP Error {e.code}: {body[:200]}]", []
    except Exception as e:
        return f"[Error: {str(e)}]", []

def call_gemini_direct(api_key, question, system_prompt_file=None):
    """Llama directamente a la API de Gemini (para testing sin proxy)."""
    # Lee el system prompt del archivo si se provee
    system_prompt = ""
    if system_prompt_file:
        try:
            with open(system_prompt_file, 'r', encoding='utf-8') as f:
                content = f.read()
            # Extrae el SYSTEM_PROMPT del archivo JS
            match = re.search(r"const SYSTEM_PROMPT = `(.*?)`;", content, re.DOTALL)
            if match:
                system_prompt = match.group(1)
        except Exception:
            pass

    model = 'gemini-2.0-flash'
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    body = {
        "system_instruction": {"parts": [{"text": system_prompt}]} if system_prompt else None,
        "contents": [{"role": "user", "parts": [{"text": question}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024}
    }
    if not body["system_instruction"]:
        del body["system_instruction"]

    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            return text, []
    except Exception as e:
        return f"[Error: {str(e)}]", []

def evaluate_response(test_id, answer):
    """Evalúa si la respuesta contiene los keywords clave. Retorna (bool, keywords_encontradas, keywords_faltantes)."""
    keywords = RESPUESTA_KEYWORDS.get(test_id, [])
    if not keywords:
        return None, [], []

    answer_lower = answer.lower()
    found = [kw for kw in keywords if kw.lower() in answer_lower]
    missing = [kw for kw in keywords if kw.lower() not in answer_lower]

    # Pasa si tiene al menos el 60% de los keywords (algunos tests tienen lista exhaustiva)
    threshold = max(1, int(len(keywords) * 0.6))
    passed = len(found) >= threshold
    return passed, found, missing

def run_tests(proxy_url=None, api_key=None, verbose=False):
    """Corre todos los tests y genera reporte."""
    try:
        with open(TEST_FILE, 'r', encoding='utf-8') as f:
            suite = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: No se encontró {TEST_FILE}")
        print("Asegúrate de correr este script desde el directorio del repo normalis.")
        sys.exit(1)

    tests = suite['tests']
    total = len(tests)
    passed_count = 0
    failed_count = 0
    error_count = 0
    results = []

    print(f"\n{'='*70}")
    print(f"NormaLis — Test Suite Normativo")
    print(f"Fuentes: {', '.join(suite['meta']['fuentes'])}")
    print(f"Total: {total} preguntas | Criterio de aprobación: >= 85%")
    print(f"{'='*70}\n")

    for i, test in enumerate(tests):
        tid = test['id']
        pregunta = test['pregunta']

        print(f"[{i+1:02d}/{total}] {tid}: {pregunta[:65]}...")

        # Llamar al servicio
        if proxy_url:
            answer, sources = call_proxy(proxy_url, pregunta)
        elif api_key:
            answer, sources = call_gemini_direct(api_key, pregunta, 'functions/index.js')
        else:
            print("  ERROR: Se requiere --proxy o --apikey")
            sys.exit(1)

        if answer.startswith('[Error') or answer.startswith('[HTTP Error'):
            status = "ERROR"
            error_count += 1
        else:
            passed, found_kw, missing_kw = evaluate_response(tid, answer)
            if passed:
                status = "✅ PASS"
                passed_count += 1
            else:
                status = "❌ FAIL"
                failed_count += 1

        print(f"  → {status}")

        if verbose or status != "✅ PASS":
            print(f"  Artículo: {test['articulo_fuente']}")
            print(f"  Respuesta esperada: {test['respuesta_correcta'][:120]}...")
            if not answer.startswith('['):
                print(f"  Respuesta obtenida: {answer[:200]}...")
            if status == "❌ FAIL":
                print(f"  Keywords encontradas: {found_kw}")
                print(f"  Keywords faltantes:   {missing_kw}")
                print(f"  ⚠️  Trampa común: {test.get('trampa_comun', '')}")
            if sources:
                print(f"  Fuentes: {[s.get('uri','')[:60] for s in sources[:2]]}")
        print()

        results.append({
            "id": tid,
            "status": status,
            "answer_len": len(answer),
            "sources_count": len(sources)
        })

        # Rate limiting: esperar entre llamadas
        time.sleep(1.5)

    # Resumen
    print(f"\n{'='*70}")
    print(f"RESULTADOS FINALES")
    print(f"{'='*70}")
    print(f"✅ Pasaron:  {passed_count}/{total} ({passed_count*100//total}%)")
    print(f"❌ Fallaron: {failed_count}/{total} ({failed_count*100//total}%)")
    if error_count:
        print(f"💥 Errores:  {error_count}/{total}")

    approval_pct = passed_count * 100 // total
    if approval_pct >= 85:
        print(f"\n✅ APROBADO: {approval_pct}% >= 85% requerido")
        print("El sistema cumple el umbral mínimo de confiabilidad normativa.")
    else:
        print(f"\n❌ NO APROBADO: {approval_pct}% < 85% requerido")
        print("El sistema NO cumple el umbral mínimo. Revisar el system prompt.")
        print("\nTests fallidos:")
        for r in results:
            if r['status'] == "❌ FAIL":
                t = next(x for x in tests if x['id'] == r['id'])
                print(f"  - {r['id']}: {t['pregunta'][:70]}")
                print(f"    Artículo: {t['articulo_fuente']}")

    # Guardar reporte
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total": total,
        "passed": passed_count,
        "failed": failed_count,
        "errors": error_count,
        "approval_pct": approval_pct,
        "approved": approval_pct >= 85,
        "results": results
    }
    with open('normalis_test_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\nReporte guardado en: normalis_test_report.json")

    return approval_pct >= 85

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='NormaLis Normative Test Runner')
    parser.add_argument('--proxy', default=None, help='URL del proxy Firebase')
    parser.add_argument('--apikey', default=None, help='Gemini API key (testing directo)')
    parser.add_argument('--verbose', action='store_true', help='Mostrar todas las respuestas')
    args = parser.parse_args()

    if not args.proxy and not args.apikey:
        print("Modo demo: mostrando estructura del test suite")
        print()
        try:
            with open(TEST_FILE, 'r', encoding='utf-8') as f:
                suite = json.load(f)
            for t in suite['tests']:
                print(f"[{t['id']}] {t['pregunta']}")
                print(f"  Fuente: {t['articulo_fuente']}")
                print()
        except FileNotFoundError:
            print(f"ERROR: No se encontró {TEST_FILE}")
        print("Para correr los tests, usa:")
        print("  python3 normalis_test_runner.py --proxy https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy")
        sys.exit(0)

    success = run_tests(
        proxy_url=args.proxy,
        api_key=args.apikey,
        verbose=args.verbose
    )
    sys.exit(0 if success else 1)
