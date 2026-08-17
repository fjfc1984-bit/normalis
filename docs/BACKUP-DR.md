# Backups y Continuidad del Negocio — Firestore (NormaLis)

Estado actual: **NormaLis no tiene backups propios configurados.** Depende
enteramente de la durabilidad de la infraestructura de Google Cloud
(Firestore replica los datos entre zonas, pero eso protege contra fallas de
hardware — no contra un `deleteDoc` accidental, un bug que borre datos en
masa, o una cuenta de servicio comprometida). Esto es una brecha real frente
a ISO 27001 Anexo A.17 (continuidad del negocio) y debe cerrarse antes de
poder documentar un RTO/RPO creíble frente a un cliente o auditor.

Esta guía es para que **Fernando la ejecute** desde Google Cloud Console o
`gcloud` CLI — requiere permisos de owner/editor sobre el proyecto
`normalis-5587d`, que Claude no tiene en este entorno.

## 1. Backups automáticos gestionados de Firestore (recomendado)

Firestore tiene un producto de backup gestionado nativo (distinto de
`export`) que no requiere Cloud Scheduler ni Cloud Functions:

```bash
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=7d \
  --project=normalis-5587d
```

Esto crea un backup diario retenido 7 días, gestionado por Google — sin
infraestructura adicional que mantener. Verificar que quedó activo:

```bash
gcloud firestore backups schedules list --database='(default)' --project=normalis-5587d
```

Para restaurar (crea una base de datos NUEVA a partir del backup — no
sobrescribe la existente, así que es seguro probarlo sin riesgo):

```bash
gcloud firestore databases restore \
  --source-backup=<BACKUP_ID> \
  --destination-database='normalis-restore-test' \
  --project=normalis-5587d
```

## 2. Exportación manual a Cloud Storage (alternativa / respaldo adicional)

Si además se quiere una copia exportable fuera de Firestore (por ejemplo
para análisis o portabilidad ante un cambio de proveedor):

```bash
# Crear el bucket una sola vez
gsutil mb -l us-central1 gs://normalis-backups-5587d

# Exportar manualmente
gcloud firestore export gs://normalis-backups-5587d/$(date +%Y-%m-%d) \
  --project=normalis-5587d
```

Para automatizar esto diariamente sin backend propio, usar Cloud Scheduler +
una Cloud Function HTTP mínima que dispare el export — o, más simple,
dejarlo solo en el backup gestionado del paso 1, que ya cubre el caso de uso
principal (recuperación ante desastre / borrado accidental).

## 3. RTO / RPO propuestos (borrador — requiere validación de negocio)

| Escenario | RPO objetivo | RTO objetivo |
|---|---|---|
| Borrado accidental de datos de una IPS | 24 horas (backup diario) | 4 horas (restaurar backup + reasignar) |
| Corrupción de la base completa | 24 horas | 24 horas |
| Caída de Firebase/Google Cloud | Depende del SLA de Google Cloud (fuera del control de NormaLis) | Depende del SLA de Google Cloud |

Estos números son un punto de partida razonable para una IPS pequeña/mediana,
no una cifra certificada — antes de comunicarlos a un cliente o incluirlos en
un contrato de nivel de servicio (SLA), deben validarse con el negocio y,
si van a tener efecto contractual, revisarse con asesoría legal.

## 4. Qué falta para que esto sea un plan de continuidad real (no solo backups)

- Probar la restauración al menos una vez (no solo tener el comando — 
  ejecutarlo contra un proyecto de prueba y confirmar que los datos
  restaurados son usables).
- Documentar quién tiene autoridad para decidir un rollback y a quién se
  notifica.
- Definir qué pasa con el Worker de Cloudflare y las reglas de Firestore en
  un escenario de recuperación (el backup de Firestore no incluye
  `firestore.rules` ni el código del Worker — esos ya están versionados en
  git, lo cual ayuda).
