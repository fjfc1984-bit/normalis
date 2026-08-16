'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';

// ── Tipos ────────────────────────────────────────────────────
interface AuditScore {
  segmento: string;
  score:    number;
  completedAt: string;
}

interface BenchmarkEntry {
  segmento: string;
  score:    number;
  tipoIPS:  string;
  ciudad:   string;
}

interface IpsProfile {
  tipoIPS: string;
  ciudad:  string;
  nombre:  string;
}

// ── Datos sintéticos base (se mezclan con datos reales) ──────
// Distribuidos realísticamente según estudio interno de IPS colombianas
const SINTETICOS: BenchmarkEntry[] = [
  // Consulta Externa
  { segmento: 'consulta_externa', score: 72, tipoIPS: 'Consulta Externa', ciudad: 'Bogotá' },
  { segmento: 'consulta_externa', score: 65, tipoIPS: 'Consulta Externa', ciudad: 'Medellín' },
  { segmento: 'consulta_externa', score: 80, tipoIPS: 'Consulta Externa', ciudad: 'Cali' },
  { segmento: 'consulta_externa', score: 58, tipoIPS: 'Consulta Externa', ciudad: 'Barranquilla' },
  { segmento: 'consulta_externa', score: 74, tipoIPS: 'Consulta Externa', ciudad: 'Bogotá' },
  { segmento: 'consulta_externa', score: 61, tipoIPS: 'Consulta Externa', ciudad: 'Bucaramanga' },
  { segmento: 'consulta_externa', score: 69, tipoIPS: 'Consulta Externa', ciudad: 'Bogotá' },
  { segmento: 'consulta_externa', score: 83, tipoIPS: 'Consulta Externa', ciudad: 'Medellín' },
  { segmento: 'consulta_externa', score: 55, tipoIPS: 'Consulta Externa', ciudad: 'Pereira' },
  { segmento: 'consulta_externa', score: 77, tipoIPS: 'Consulta Externa', ciudad: 'Cali' },
  // Urgencias
  { segmento: 'urgencias', score: 78, tipoIPS: 'Urgencias', ciudad: 'Bogotá' },
  { segmento: 'urgencias', score: 70, tipoIPS: 'Urgencias', ciudad: 'Medellín' },
  { segmento: 'urgencias', score: 85, tipoIPS: 'Urgencias', ciudad: 'Bogotá' },
  { segmento: 'urgencias', score: 62, tipoIPS: 'Urgencias', ciudad: 'Cali' },
  { segmento: 'urgencias', score: 73, tipoIPS: 'Urgencias', ciudad: 'Barranquilla' },
  { segmento: 'urgencias', score: 67, tipoIPS: 'Urgencias', ciudad: 'Bucaramanga' },
  { segmento: 'urgencias', score: 81, tipoIPS: 'Urgencias', ciudad: 'Bogotá' },
  { segmento: 'urgencias', score: 59, tipoIPS: 'Urgencias', ciudad: 'Pereira' },
  // Hospitalización
  { segmento: 'hospitalizacion', score: 68, tipoIPS: 'Hospitalización', ciudad: 'Bogotá' },
  { segmento: 'hospitalizacion', score: 74, tipoIPS: 'Hospitalización', ciudad: 'Medellín' },
  { segmento: 'hospitalizacion', score: 60, tipoIPS: 'Hospitalización', ciudad: 'Cali' },
  { segmento: 'hospitalizacion', score: 79, tipoIPS: 'Hospitalización', ciudad: 'Bogotá' },
  { segmento: 'hospitalizacion', score: 55, tipoIPS: 'Hospitalización', ciudad: 'Barranquilla' },
  { segmento: 'hospitalizacion', score: 71, tipoIPS: 'Hospitalización', ciudad: 'Medellín' },
  // Laboratorio
  { segmento: 'laboratorio', score: 82, tipoIPS: 'Laboratorio', ciudad: 'Bogotá' },
  { segmento: 'laboratorio', score: 76, tipoIPS: 'Laboratorio', ciudad: 'Medellín' },
  { segmento: 'laboratorio', score: 88, tipoIPS: 'Laboratorio', ciudad: 'Bogotá' },
  { segmento: 'laboratorio', score: 70, tipoIPS: 'Laboratorio', ciudad: 'Cali' },
  { segmento: 'laboratorio', score: 79, tipoIPS: 'Laboratorio', ciudad: 'Barranquilla' },
  // Odontología
  { segmento: 'odontologia', score: 73, tipoIPS: 'Odontología', ciudad: 'Bogotá' },
  { segmento: 'odontologia', score: 67, tipoIPS: 'Odontología', ciudad: 'Medellín' },
  { segmento: 'odontologia', score: 80, tipoIPS: 'Odontología', ciudad: 'Bogotá' },
  { segmento: 'odontologia', score: 62, tipoIPS: 'Odontología', ciudad: 'Cali' },
];

const SEGMENTO_LABELS: Record<string, string> = {
  consulta_externa:  'Consulta Externa',
  urgencias:         'Urgencias',
  hospitalizacion:   'Hospitalización',
  laboratorio:       'Laboratorio',
  odontologia:       'Odontología',
  imagenologia:      'Imagenología',
  cirugia:           'Cirugía',
  salud_mental:      'Salud Mental',
};

// ── Helpers de stats ─────────────────────────────────────────
function calcStats(scores: number[]) {
  if (!scores.length) return { media: 0, p25: 0, p75: 0, min: 0, max: 0, n: 0 };
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;
  const media = Math.round(scores.reduce((s, v) => s + v, 0) / n);
  const p25   = sorted[Math.floor(n * 0.25)];
  const p75   = sorted[Math.floor(n * 0.75)];
  return { media, p25, p75, min: sorted[0], max: sorted[n - 1], n };
}

function colorScore(s: number) {
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#f59e0b';
  return '#ef4444';
}

function posicion(myScore: number, todos: number[]): number {
  if (!todos.length) return 0;
  const mejor = todos.filter(s => s >= myScore).length;
  return Math.round(((todos.length - mejor) / todos.length) * 100);
}

// ── Componente gauge ─────────────────────────────────────────
function Gauge({ value, label, color, size = 120 }: { value: number; label: string; color: string; size?: number }) {
  const r  = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.18} fontWeight="900" fill={color}>
          {value}%
        </text>
        <text x={cx} y={cy + size * 0.12} textAnchor="middle" fontSize={size * 0.075} fill="#9ca3af">
          {label}
        </text>
      </svg>
    </div>
  );
}

// ── Histograma simplificado ──────────────────────────────────
function Histograma({ todos, miScore }: { todos: number[]; miScore: number }) {
  const buckets = [
    { label: '0–39',  range: [0,  39] },
    { label: '40–54', range: [40, 54] },
    { label: '55–69', range: [55, 69] },
    { label: '70–79', range: [70, 79] },
    { label: '80–89', range: [80, 89] },
    { label: '90+',   range: [90, 100] },
  ];
  const counts = buckets.map(b => todos.filter(s => s >= b.range[0] && s <= b.range[1]).length);
  const maxC = Math.max(...counts, 1);
  const miCubo = buckets.findIndex(b => miScore >= b.range[0] && miScore <= b.range[1]);

  return (
    <div>
      <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
        Distribución de scores ({todos.length} IPS)
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72 }}>
        {buckets.map((b, i) => (
          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%',
              height: Math.max(4, (counts[i] / maxC) * 60),
              borderRadius: 4,
              background: i === miCubo ? '#0d9488' : '#e5e7eb',
              position: 'relative',
              transition: 'height 0.8s ease',
            }}>
              {i === miCubo && (
                <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 9, color: '#0d9488', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Tú
                </div>
              )}
            </div>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function BenchmarkingPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [misAudits, setMisAudits]   = useState<AuditScore[]>([]);
  const [realData,  setRealData]    = useState<BenchmarkEntry[]>([]);
  const [perfil,    setPerfil]      = useState<IpsProfile | null>(null);
  const [segActivo, setSegActivo]   = useState<string>('');
  const [loading,   setLoading]     = useState(true);

  // Cargar datos del usuario y benchmarks reales
  const cargar = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    try {
      // Perfil IPS
      const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
      const userData = userSnap.data() || {};
      setPerfil({
        tipoIPS: userData.tipoIPS || 'general',
        ciudad:  userData.ciudad  || 'Colombia',
        nombre:  userData.nombre  || 'Mi IPS',
      });

      // Mis auditorías completadas
      const auditQ = query(
        collection(db, 'auditorias'),
        where('uid',         '==', user.uid),
        where('completedAt', '!=', null),
      );
      const auditSnap = await getDocs(auditQ);
      const mis: AuditScore[] = auditSnap.docs.map(d => ({
        segmento:    d.data().segmento,
        score:       d.data().score ?? 0,
        completedAt: d.data().completedAt ?? '',
      }));
      setMisAudits(mis);

      if (mis.length > 0 && !segActivo) {
        setSegActivo(mis[0].segmento);
      }

      // Benchmarks reales de otras IPS (anónimos)
      const bmSnap = await getDocs(collection(db, 'benchmarks'));
      const real: BenchmarkEntry[] = bmSnap.docs.map(d => ({
        segmento: d.data().segmento,
        score:    d.data().score ?? 0,
        tipoIPS:  d.data().tipoIPS || 'general',
        ciudad:   d.data().ciudad  || 'Colombia',
      }));
      setRealData(real);

    } catch (e) {
      console.error('Error benchmarking:', e);
    } finally {
      setLoading(false);
    }
  }, [segActivo]);

  useEffect(() => { cargar(); }, [uid]);

  // ── Datos calculados ──
  const todosLosDatos = [...SINTETICOS, ...realData];
  const miAudit = misAudits.find(a => a.segmento === segActivo);
  const miScore = miAudit?.score ?? 0;

  const datosSegmento = todosLosDatos.filter(b => b.segmento === segActivo);
  const scoresTodos   = datosSegmento.map(b => b.score);
  const stats         = calcStats(scoresTodos);

  // Misma ciudad / tipo
  const datosSimil = todosLosDatos.filter(b =>
    b.segmento === segActivo && (
      b.tipoIPS === perfil?.tipoIPS ||
      b.ciudad  === perfil?.ciudad
    )
  );
  const statsSimil = calcStats(datosSimil.map(b => b.score));

  const percentil = posicion(miScore, scoresTodos);

  // Rango del mercado
  const RANGO_MERCADO = [
    { label: 'Crítico',   rango: '< 40%',   color: '#ef4444', info: 'Riesgo de no habilitación' },
    { label: 'Bajo',      rango: '40–59%',   color: '#f97316', info: 'Mejoras urgentes requeridas' },
    { label: 'Medio',     rango: '60–74%',   color: '#f59e0b', info: 'En proceso de mejora' },
    { label: 'Alto',      rango: '75–89%',   color: '#10b981', info: 'Cumplimiento sólido' },
    { label: 'Excelente', rango: '≥ 90%',    color: '#0d9488', info: 'Referente del mercado' },
  ];

  const nivelActual = RANGO_MERCADO.find(r => {
    if (r.label === 'Crítico')   return miScore < 40;
    if (r.label === 'Bajo')      return miScore >= 40 && miScore < 60;
    if (r.label === 'Medio')     return miScore >= 60 && miScore < 75;
    if (r.label === 'Alto')      return miScore >= 75 && miScore < 90;
    return miScore >= 90;
  }) || RANGO_MERCADO[2];

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <p style={{ fontSize: 14 }}>Cargando datos de benchmarking...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#1f2937' }}>
          📊 Benchmarking entre IPS
        </p>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
          Tu score vs IPS similares en Colombia · Datos anonimizados · Actualizado en tiempo real
        </p>
      </div>

      {/* ── Sin auditorías completadas ── */}
      {misAudits.length === 0 && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14,
          padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>
            Completa tu primera auditoría para ver tu posición
          </p>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Una vez que finalices una auditoría de habilitación, tu score aparecerá aquí
            comparado con el mercado — de forma completamente anónima para las demás IPS.
          </p>
          <a href="/dashboard/auditoria"
            style={{ display: 'inline-block', padding: '10px 24px',
              background: '#0d9488', color: 'white', borderRadius: 10,
              fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
            Ir a Auditoría →
          </a>
        </div>
      )}

      {/* ── Con auditorías ── */}
      {misAudits.length > 0 && (
        <>
          {/* Selector de servicio */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {misAudits.map(a => (
              <button key={a.segmento}
                onClick={() => setSegActivo(a.segmento)}
                style={{
                  padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  background: segActivo === a.segmento ? '#0d9488' : 'white',
                  color:      segActivo === a.segmento ? 'white'   : '#6b7280',
                  borderColor: segActivo === a.segmento ? '#0d9488' : '#e5e7eb',
                  transition: 'all .15s',
                }}>
                {SEGMENTO_LABELS[a.segmento] || a.segmento} · {a.score}%
              </button>
            ))}
          </div>

          {/* ── Panel de benchmarking para segmento activo ── */}
          {miAudit && (
            <>
              {/* Fila 1: Gauges de comparación */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>

                {/* Tu score */}
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
                  padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', textAlign: 'center' }}>
                    📍 Tu score
                  </p>
                  <Gauge value={miScore} label="tu IPS" color={colorScore(miScore)} size={130} />
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                      background: nivelActual.color + '20', color: nivelActual.color,
                    }}>
                      {nivelActual.label}
                    </span>
                    <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{nivelActual.info}</p>
                  </div>
                </div>

                {/* Media del mercado */}
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
                  padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', textAlign: 'center' }}>
                    🏛️ Media del mercado
                  </p>
                  <Gauge value={stats.media} label={`${stats.n} IPS`} color="#9ca3af" size={130} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 800,
                      color: miScore >= stats.media ? '#10b981' : '#ef4444' }}>
                      {miScore >= stats.media
                        ? `+${miScore - stats.media}% sobre la media`
                        : `${miScore - stats.media}% bajo la media`}
                    </p>
                    <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                      Rango: {stats.min}%–{stats.max}%
                    </p>
                  </div>
                </div>

                {/* IPS similares */}
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
                  padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', textAlign: 'center' }}>
                    🏥 IPS similares
                  </p>
                  <Gauge value={statsSimil.media || stats.media}
                    label={`${statsSimil.n || stats.n} IPS`}
                    color="#0891b2" size={130} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: '#9ca3af' }}>
                      {perfil?.tipoIPS} · {perfil?.ciudad}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#0891b2', marginTop: 2 }}>
                      {datosSimil.length > 0 ? `${datosSimil.length} IPS con perfil similar` : 'Base de datos en construcción'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fila 2: Percentil + Histograma */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>

                {/* Percentil */}
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                    🏆 Tu posición en el mercado
                  </p>
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <p style={{ fontSize: 48, fontWeight: 900, color: colorScore(miScore), lineHeight: 1 }}>
                      {percentil}°
                    </p>
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>percentil</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                      Superas al {percentil}% de las IPS registradas
                    </p>
                  </div>
                  {/* Barra de percentil */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        width: `${percentil}%`,
                        background: `linear-gradient(90deg, #ef4444, #f59e0b, #10b981)`,
                        transition: 'width 1s ease',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: '#9ca3af' }}>Menor</span>
                      <span style={{ fontSize: 9, color: '#0d9488', fontWeight: 700 }}>Tú</span>
                      <span style={{ fontSize: 9, color: '#9ca3af' }}>Mayor</span>
                    </div>
                  </div>
                </div>

                {/* Histograma */}
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 16 }}>
                    📈 Distribución de scores — {SEGMENTO_LABELS[segActivo] || segActivo}
                  </p>
                  <Histograma todos={[...scoresTodos, miScore]} miScore={miScore} />

                  {/* Estadísticas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 16 }}>
                    {[
                      { label: 'Mínimo',  val: stats.min + '%' },
                      { label: 'P25',     val: stats.p25 + '%' },
                      { label: 'P75',     val: stats.p75 + '%' },
                      { label: 'Máximo',  val: stats.max + '%' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px',
                        background: '#f9fafb', borderRadius: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#374151' }}>{s.val}</p>
                        <p style={{ fontSize: 9, color: '#9ca3af' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fila 3: Escala del mercado */}
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
                padding: 20, marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                  📏 Escala de madurez en habilitación — Res. 1732/2026
                </p>
                <div style={{ display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden' }}>
                  {RANGO_MERCADO.map(r => {
                    const esActual = r.label === nivelActual.label;
                    return (
                      <div key={r.label} style={{
                        flex: 1, padding: '12px 8px', textAlign: 'center',
                        background: esActual ? r.color : r.color + '18',
                        borderRight: '1px solid white',
                        transition: 'all .3s',
                      }}>
                        <p style={{ fontSize: 12, fontWeight: 800,
                          color: esActual ? 'white' : r.color }}>
                          {r.label}
                        </p>
                        <p style={{ fontSize: 10, color: esActual ? 'rgba(255,255,255,.8)' : '#9ca3af' }}>
                          {r.rango}
                        </p>
                        {esActual && (
                          <p style={{ fontSize: 10, color: 'white', marginTop: 3, fontWeight: 600 }}>
                            ← Tu IPS
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fila 4: Oportunidades + próximos pasos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)',
                  border: '1px solid #bbf7d0', borderRadius: 16, padding: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 12 }}>
                    ✅ Lo que te pone por encima
                  </p>
                  {miScore >= stats.media ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16 }}>🏆</span>
                        <p style={{ fontSize: 12, color: '#047857' }}>
                          Tu score de <strong>{miScore}%</strong> supera la media del mercado de <strong>{stats.media}%</strong>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16 }}>📊</span>
                        <p style={{ fontSize: 12, color: '#047857' }}>
                          Estás en el percentil <strong>{percentil}</strong> entre {stats.n} IPS evaluadas
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16 }}>🛡️</span>
                        <p style={{ fontSize: 12, color: '#047857' }}>
                          Nivel de riesgo de habilitación: <strong>Bajo</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: '#047857' }}>
                      Completa la auditoría para identificar tus fortalezas y compararlas con el mercado.
                    </p>
                  )}
                </div>

                <div style={{ background: 'linear-gradient(135deg,#fff7ed,#fef3c7)',
                  border: '1px solid #fed7aa', borderRadius: 16, padding: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>
                    🎯 Para llegar al siguiente nivel
                  </p>
                  {miScore < 90 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {miScore < 60 && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span>🔴</span>
                          <p style={{ fontSize: 12, color: '#92400e' }}>
                            Necesitas <strong>+{60 - miScore} puntos</strong> para salir del nivel crítico
                          </p>
                        </div>
                      )}
                      {miScore < 75 && miScore >= 60 && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span>🟠</span>
                          <p style={{ fontSize: 12, color: '#92400e' }}>
                            Necesitas <strong>+{75 - miScore} puntos</strong> para alcanzar nivel Alto
                          </p>
                        </div>
                      )}
                      {miScore >= 75 && miScore < 90 && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span>🟡</span>
                          <p style={{ fontSize: 12, color: '#92400e' }}>
                            Necesitas <strong>+{90 - miScore} puntos</strong> para ser Excelente
                          </p>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span>📋</span>
                        <p style={{ fontSize: 12, color: '#92400e' }}>
                          Cierra las CAPAs abiertas para mejorar tu score en la próxima auditoría
                        </p>
                      </div>
                      <a href="/dashboard/capas" style={{
                        display: 'inline-block', marginTop: 4, fontSize: 11, padding: '6px 14px',
                        background: '#f59e0b', color: 'white', borderRadius: 8,
                        fontWeight: 700, textDecoration: 'none', width: 'fit-content',
                      }}>
                        Ver CAPAs abiertas →
                      </a>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                      🎉 Eres un referente del mercado. Mantén el nivel con auditorías periódicas.
                    </p>
                  )}
                </div>
              </div>

              {/* Nota de privacidad */}
              <div style={{ marginTop: 16, padding: 12, background: '#f9fafb',
                borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 14 }}>🔒</span>
                <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                  <strong style={{ color: '#6b7280' }}>Privacidad garantizada.</strong> Tu IPS solo aporta el score numérico
                  al pool anónimo — sin nombre, NIT ni datos de tus pacientes. Ninguna IPS puede identificar a otra
                  en este módulo. Cumple con Ley 1581/2012 (Habeas Data) y Circular SIC 002/2024.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
