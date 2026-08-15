'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

// ── Criterios del simulacro de visita ──────────────────────────────────────
const CRITERIOS = [
  { cat: 'Infraestructura y Dotación', icon: '🏗️', items: [
    'Las áreas cumplen con metros cuadrados mínimos por servicio habilitado',
    'Señalización de emergencias, rutas de evacuación y extintores vigentes',
    'Baños diferenciados para usuarios y personal, con acceso para discapacitados',
    'Iluminación y ventilación adecuada en todas las áreas',
    'Equipos biomédicos con mantenimiento preventivo documentado y vigente',
    'Inventario de dotación actualizado y disponible para verificación',
  ]},
  { cat: 'Talento Humano', icon: '👥', items: [
    'Hojas de vida del personal con soportes completos y actualizados',
    'Tarjetas profesionales vigentes de todo el personal asistencial (RETHUS)',
    'Contratos laborales o de prestación de servicios firmados y vigentes',
    'Certificados de soporte vital (SVB/SVA) vigentes según aplique',
    'Inducción y reinducción documentada para el personal',
    'Carné de vacunación del personal asistencial al día',
  ]},
  { cat: 'Procesos y Procedimientos', icon: '📋', items: [
    'Manual de funciones y procedimientos actualizado y socializado',
    'Protocolos de atención por servicio habilitado disponibles',
    'Protocolo de bioseguridad y manejo de residuos hospitalarios',
    'Consentimientos informados por procedimiento disponibles',
    'Protocolo de referencia y contrarreferencia establecido',
    'Guías de práctica clínica adoptadas y disponibles',
  ]},
  { cat: 'Sistema de Gestión de Calidad', icon: '📊', items: [
    'PAMEC actualizado con autoevaluación del año en curso',
    'Indicadores de calidad con metas, resultados y análisis',
    'Plan de mejoramiento vigente con acciones y responsables',
    'Actas de comités (COPASO, farmacia, infecciones) al día',
    'Registro de eventos adversos e incidentes documentado',
    'Sistema de PQRS activo con seguimiento y cierre documentado',
  ]},
  { cat: 'Medicamentos y Dispositivos', icon: '💊', items: [
    'Botiquín de urgencias completo y con medicamentos vigentes',
    'Control de temperatura de neveras de medicamentos documentado',
    'Inventario de medicamentos sin vencidos en stock',
    'Dispositivos médicos con registro INVIMA vigente',
    'Programa de gestión de residuos peligrosos activo (PGIRH)',
  ]},
];

type CheckMap = Record<string, boolean>;

function SimulacroContent() {
  const { nit } = useAuth();
  const [checks, setChecks] = useState<CheckMap>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [open, setOpen]         = useState<Record<number, boolean>>({ 0: true });

  useEffect(() => {
    if (!nit) return;
    getDoc(doc(db, 'simulacros', nit)).then(snap => {
      if (snap.exists()) setChecks((snap.data() as { checks: CheckMap }).checks ?? {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [nit]);

  async function toggle(key: string) {
    if (!nit) return;
    const updated = { ...checks, [key]: !checks[key] };
    setChecks(updated);
    setSaving(true);
    try {
      await setDoc(doc(db, 'simulacros', nit), { checks: updated, nit, updatedAt: new Date().toISOString() }, { merge: true });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!nit) return;
    setChecks({});
    setDoc(doc(db, 'simulacros', nit), { checks: {}, nit, updatedAt: new Date().toISOString() });
  }

  // Totales globales
  const total   = CRITERIOS.reduce((s, c) => s + c.items.length, 0);
  const checked = Object.values(checks).filter(Boolean).length;
  const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;
  const nivel   = pct >= 90 ? { label: 'LISTO PARA VISITA', color: 'text-green-600 bg-green-50 border-green-200' }
                : pct >= 70 ? { label: 'REQUIERE AJUSTES MENORES', color: 'text-amber-600 bg-amber-50 border-amber-200' }
                :             { label: 'NECESITA PREPARACION', color: 'text-red-600 bg-red-50 border-red-200' };

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando simulacro...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Simulacro de Visita</h2>
          <p className="text-sm text-gray-500 mt-1">
            Lista de verificación pre-visita Secretaría de Salud · Res. 1732/2026
          </p>
        </div>
        <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Reiniciar
        </button>
      </div>

      {/* ── Resumen ── */}
      <div className={`border rounded-xl px-5 py-4 mb-6 ${nivel.color}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{nivel.label}</p>
            <p className="text-sm mt-0.5">{checked} de {total} criterios verificados</p>
          </div>
          <div className="text-4xl font-black">{pct}%</div>
        </div>
        <div className="mt-3 bg-white/60 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Categorías ── */}
      <div className="space-y-3">
        {CRITERIOS.map((cat, ci) => {
          const catTotal   = cat.items.length;
          const catChecked = cat.items.filter((_, ii) => checks[`${ci}-${ii}`]).length;
          const isOpen     = open[ci] ?? false;

          return (
            <div key={ci} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(o => ({ ...o, [ci]: !isOpen }))}
              >
                <span className="font-medium text-sm text-gray-800">
                  <span className="mr-2">{cat.icon}</span>{cat.cat}
                </span>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`font-semibold ${catChecked === catTotal ? 'text-green-600' : 'text-gray-600'}`}>
                    {catChecked}/{catTotal}
                  </span>
                  <span>{isOpen ? '▲' : '▼'}</span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {cat.items.map((item, ii) => {
                    const key = `${ci}-${ii}`;
                    const done = !!checks[key];
                    return (
                      <label
                        key={ii}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                          ${done ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggle(key)}
                          className="mt-0.5 accent-green-600 w-4 h-4 shrink-0"
                        />
                        <span className={`text-sm leading-snug ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 text-xs bg-primary-600 text-white px-3 py-1.5 rounded-full shadow">
          Guardando...
        </div>
      )}
    </div>
  );
}

export default function SimulacrosPage() {
  return (
    <AuthGuard>
      <SimulacroContent />
    </AuthGuard>
  );
}
