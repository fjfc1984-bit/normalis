# Política de Seguridad — NormaLis

Este documento describe cómo reportar una vulnerabilidad de seguridad en NormaLis
y cómo respondemos internamente cuando se detecta un incidente. Es el punto de
partida del proceso de gestión de incidentes exigido por ISO 27001 Anexo A.16.

## Reportar una vulnerabilidad

Si encuentras una vulnerabilidad de seguridad en NormaLis (app.normalis.co,
normalis.co, o la API en `*.workers.dev`), repórtala de forma responsable:

- **Correo:** seguridad@normalis.co (o, mientras se activa ese buzón,
  fjfc1984@gmail.com con el asunto `[SEGURIDAD]`)
- **Qué incluir:** pasos para reproducir, impacto estimado, y si es posible,
  una prueba de concepto no destructiva.
- **Qué NO hacer:** no accedas, modifiques ni elimines datos de otros usuarios;
  no ejecutes pruebas de denegación de servicio; no divulgues la vulnerabilidad
  públicamente antes de que confirmemos una corrección.

**Tiempo de respuesta objetivo:** confirmación de recepción en 2 días hábiles,
evaluación de severidad en 5 días hábiles.

## Alcance

Dentro de alcance: la aplicación web (Next.js/Vercel), el Worker de Cloudflare
(`normalis.fjfc1984.workers.dev`), las reglas de seguridad de Firestore, y la
API pública de integraciones (`/api/v1/*`).

Fuera de alcance: ingeniería social contra el equipo de NormaLis, ataques
físicos, y vulnerabilidades en infraestructura de terceros (Firebase/Google
Cloud, Cloudflare, Vercel, Resend) que deben reportarse directamente a esos
proveedores.

## Proceso interno de respuesta a incidentes

1. **Detección** — vía reporte externo (este canal), alertas de Sentry
   (`sentryCapture` en el Worker), o revisión manual de la bitácora de
   seguridad (`/dashboard/seguridad`, colección `bitacora_seguridad`).
2. **Contención** — para una llave API comprometida: revocarla desde
   `/dashboard/integraciones`. Para una cuenta comprometida: cambiar el rol a
   `rechazado` desde `/admin` (bloquea el acceso de inmediato vía
   `AuthGuard`) y forzar cierre de sesión.
3. **Evaluación de alcance** — ¿qué datos pudieron verse afectados? ¿de
   cuántas IPS? La bitácora de seguridad y los logs de Sentry son la fuente
   primaria para reconstruir la línea de tiempo.
4. **Notificación** — si hay datos personales comprometidos, NormaLis debe
   notificar a los titulares y, cuando aplique, a la Superintendencia de
   Industria y Comercio (SIC), conforme al artículo 17(n) de la Ley
   1581/2012 y los plazos que defina la reglamentación vigente. **Este paso
   requiere confirmación con asesoría legal — no hay un plazo único
   codificado en la ley, y el criterio de "riesgo para los titulares"
   requiere análisis caso a caso.**
5. **Remediación** — corregir la causa raíz, desplegar el fix, documentar
   la lección aprendida.

## Estado de madurez (honesto, agosto 2026)

NormaLis no tiene todavía un equipo de seguridad dedicado ni un SLA formal
de respuesta a incidentes certificado externamente. Este documento es el
primer paso hacia un SGSI (Sistema de Gestión de Seguridad de la
Información) formal — ver `/desarrolladores` y la página de Confianza y
Seguridad para el estado actualizado de controles técnicos implementados.
