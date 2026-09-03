/**
 * lib/crmTypes.ts
 * Tipos del CRM interno de NormaLis (embudo unificado de leads +
 * prospectos + oportunidades hacia piloto/cliente). No confundir con
 * datos de clientes reales en `usuarios` — este CRM vive antes de que
 * un contacto se convierta en cuenta real (eso sigue pasando por
 * /admin → Solicitudes/Pilotos, como siempre).
 */

import type { Timestamp } from 'firebase/firestore';

export type CRMEtapa =
  | 'nuevo'
  | 'contactado'
  | 'calificado'
  | 'demo'
  | 'propuesta'
  | 'piloto'
  | 'cliente'
  | 'perdido';

export const CRM_ETAPAS: CRMEtapa[] = [
  'nuevo', 'contactado', 'calificado', 'demo', 'propuesta', 'piloto', 'cliente', 'perdido',
];

export const ETAPA_LABEL: Record<CRMEtapa, string> = {
  nuevo:      'Nuevo',
  contactado: 'Contactado',
  calificado: 'Calificado',
  demo:       'Demo agendada',
  propuesta:  'Propuesta enviada',
  piloto:     'Piloto activo',
  cliente:    'Cliente',
  perdido:    'Perdido',
};

export const ETAPA_COLOR: Record<CRMEtapa, string> = {
  nuevo:      'bg-gray-100 text-gray-600 border-gray-200',
  contactado: 'bg-blue-50 text-blue-700 border-blue-200',
  calificado: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  demo:       'bg-purple-50 text-purple-700 border-purple-200',
  propuesta:  'bg-amber-50 text-amber-700 border-amber-200',
  piloto:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  cliente:    'bg-green-50 text-green-700 border-green-200',
  perdido:    'bg-red-50 text-red-700 border-red-200',
};

export type CRMFuente =
  | 'referido'
  | 'linkedin'
  | 'organico'
  | 'demo_web'
  | 'llamada_fria'
  | 'otro';

export const FUENTE_LABEL: Record<CRMFuente, string> = {
  referido:     'Referido',
  linkedin:     'LinkedIn',
  organico:     'Orgánico / búsqueda',
  demo_web:     'Formulario demo (web)',
  llamada_fria: 'Llamada fría',
  otro:         'Otro',
};

export interface CRMContacto {
  id:                  string;
  nombre:              string;   // Nombre de la IPS / empresa
  contactoNombre:      string;   // Persona de contacto
  email:               string;
  telefono:            string;
  ciudad:              string;
  tipoIPS?:            string;
  etapa:               CRMEtapa;
  fuente:              CRMFuente;
  valorEstimado?:       number;   // COP/mes estimado
  proximaAccion?:       string;   // texto libre: "Llamar", "Enviar propuesta"
  fechaProximaAccion?:  Timestamp | null;
  origen:              'prospecto' | 'lead' | 'manual';
  origenId?:           string;   // id del doc viejo migrado (idempotencia)
  createdAt:           Timestamp | null;
  updatedAt:           Timestamp | null;
}

export interface CRMNota {
  id:        string;
  contactoId: string;
  texto:     string;
  autor:     string;   // email del admin que la escribió
  createdAt: Timestamp | null;
}
