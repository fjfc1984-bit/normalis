/**
 * NormaLis — Gemini Proxy (Firebase Functions v1)
 *
 * URL pública (predecible antes del deploy):
 *   https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy
 *
 * Setup inicial (una sola vez):
 *   cd functions && npm install
 *   firebase functions:config:set gemini.api_key="TU_CLAVE_AQUI"
 *   firebase deploy --only functions
 *
 * SISTEMA NORMATIVO EMBEBIDO v2:
 *   El system prompt ahora incluye el texto VERIFICADO de los artículos clave
 *   de la Res. 3100/2019 y sus modificaciones (Res. 544/2023, Res. 465/2025).
 *   Fuente: ICBF compilación jurídica + Alcaldía de Bogotá SISJUR.
 *   Esto elimina la dependencia de que Gemini "recuerde" correctamente los
 *   artículos y reduce la tasa de errores normativos.
 */

const functions = require('firebase-functions');
const fetch     = require('node-fetch');

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ALLOWED_ORIGINS = [
  'https://normalis.co',
  'https://www.normalis.co',
  'https://fjfc1984-bit.github.io',
];

// ═══════════════════════════════════════════════════════════════════════
// CORPUS NORMATIVO VERIFICADO
// Texto extraído de: ICBF compilación jurídica + Alcaldía de Bogotá SISJUR
// Resolución 3100 de 2019 (nov 25, 2019) + modificaciones vigentes
// ÚLTIMA VERIFICACIÓN: julio 2026
// ═══════════════════════════════════════════════════════════════════════
const CORPUS_NORMATIVO = `
=== RESOLUCIÓN 3100 DE 2019 — MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL ===
(Diario Oficial No. 51.149 de 26 de noviembre de 2019)
Por la cual se definen los procedimientos y condiciones de inscripción de los prestadores
de servicios de salud y de habilitación de los servicios de salud.
MODIFICADA POR: Resolución 544 de 2023 (Art. 2 y 3), Resolución 465 de 2025 (Art. 4, 5, 19 y 20).
DEROGÓ: Resoluciones 2003/2014, 5158/2015, 226/2015, 1416/2016.

--- ARTÍCULO 1. OBJETO ---
Definir los procedimientos y las condiciones de inscripción de los prestadores de servicios
de salud y de habilitación de los servicios de salud, y adoptar el Manual de Inscripción de
Prestadores y Habilitación de Servicios de Salud (Anexo Técnico).
PARÁGRAFO: Esta resolución NO establece competencias para el talento humano; las competencias
son definidas por los programas académicos aprobados por el Ministerio de Educación Nacional.

--- ARTÍCULO 2. CAMPO DE APLICACIÓN (modificado por Art. 1, Resolución 544/2023) ---
Aplica a:
2.1. Las instituciones prestadoras de servicios de salud (IPS).
2.2. Los profesionales independientes de salud.
2.3. El transporte especial de pacientes.
2.4. Las entidades con objeto social diferente a la prestación de servicios de salud.
2.5. Las secretarías de salud departamental o distrital o la entidad que tenga a cargo dichas competencias.
2.6. Las entidades responsables del pago de servicios de salud.
2.7. La Superintendencia Nacional de Salud.
EXCEPCIÓN: Los servicios intramurales en establecimientos carcelarios/penitenciarios con
modelo de atención Ley 1709/2014, y entidades de regímenes Especial/Excepción (Art. 279 Ley 100/1993),
salvo que decidan inscribirse voluntariamente o contraten con el SGSSS.

--- ARTÍCULO 3. CONDICIONES DE HABILITACIÓN (modificado por Art. 2, Resolución 544/2023) ---
Los prestadores de servicios de salud, para su entrada y permanencia en el Sistema Único de
Habilitación (SOGCS), deben cumplir:
3.1. Capacidad técnico-administrativa.
3.2. Suficiencia patrimonial y financiera.
3.3. Capacidad tecnológica y científica.
La condición 3.3 incluye los 7 estándares de habilitación del Manual.

--- ARTÍCULO 4. INSCRIPCIÓN Y HABILITACIÓN (modificado por Art. 1, Resolución 465/2025) ---
Todo prestador de servicios de salud debe estar inscrito en el Registro Especial de Prestadores
de Servicios de Salud (REPS), registrando como mínimo una sede con infraestructura física y por
lo menos un servicio habilitado. La inscripción y habilitación debe realizarse en los términos del Manual.
VERSIÓN ORIGINAL (antes de Res. 465/2025): no exigía "con infraestructura física" — solo "una sede".

--- ARTÍCULO 5. AUTOEVALUACIÓN (modificado por Art. 2, Resolución 465/2025)