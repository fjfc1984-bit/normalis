'use client';

import { useState, useEffect } from 'react';

export default function StatusPage() {
  const [checks, setChecks] = useState<Record<string, 'checking' | 'ok' | 'error'>>({
    firebase: 'checking',
    worker:   'checking',
    app:      'checking',
  });
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    setTimestamp(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }));

    // Check Firebase (just the app itself being up = Firebase is responding)
    fetch('https://normalis-5587d.firebaseapp.com/__/firebase/init.json')
      .then(r => r.ok ? 'ok' : 'error')
      .catch(() => 'error')
      .then(s => setChecks(c => ({ ...c, firebase: s as 'ok' | 'error' })));

    // Check Cloudflare Worker
    fetch('https://normalis.fjfc1984.workers.dev/health', { method: 'GET' })
      .then(r => r.ok ? 'ok' : 'error')
      .catch(() => 'error')
      .then(s => setChecks(c => ({ ...c, worker: s as 'ok' | 'error' })));

    // App itself is up if this page loaded
    setChecks(c => ({ ...c, app: 'ok' }));
  }, []);

  const all = Object.values(checks);
  const allOk = all.every(v => v === 'ok');
  const anyError = all.some(v => v === 'error');
  const checking = all.some(v => v === 'checking');

  const overallColor = checking ? 'bg-amber-400' : allOk ? 'bg-green-500' : 'bg-red-500';
  const overallLabel = checking ? 'Verificando...' : allOk ? 'Todos los sistemas operativos' : 'Degradación parcial del servicio';

  const services = [
    { key: 'app',      label: 'Aplicación web',            desc: 'app.normalis.co — Next.js en Vercel' },
    { key: 'firebase', label: 'Base de datos (Firebase)',   desc: 'Firestore + Authentication' },
    { key: 'worker',   label: 'API IA (Cloudflare Worker)', desc: 'Asistente normativo + proxy' },
  ];

  function StatusDot({ status }: { status: 'checking' | 'ok' | 'error' }) {
    if (status === 'checking') return (
      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
    );
    if (status === 'ok') return (
      <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
    );
    return <span className="inline-block w-3 h-3 rounded-full bg-red-500" />;
  }

  function StatusLabel({ status }: { status: 'checking' | 'ok' | 'error' }) {
    const map = { checking: 'Verificando', ok: 'Operativo', error: 'Error detectado' };
    const color = { checking: 'text-amber-600', ok: 'text-green-600', error: 'text-red-600' };
    return <span className={`text-sm font-medium ${color[status]}`}>{map[status]}</span>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary-900 text-white py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-primary-300 text-sm mb-1">NormaLis</p>
          <h1 className="text-2xl font-bold">Estado del servicio</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        {/* Overall status banner */}
        <div className={`rounded-xl px-5 py-4 mb-8 flex items-center gap-4 text-white ${overallColor}`}>
          {!checking && allOk && <span className="text-2xl">✓</span>}
          {anyError && !checking && <span className="text-2xl">!</span>}
          {checking && <span className="text-2xl animate-spin inline-block">◌</span>}
          <div>
            <p className="font-bold text-lg">{overallLabel}</p>
            {timestamp && <p className="text-sm opacity-80">Verificado el {timestamp} (hora Colombia)</p>}
          </div>
        </div>

        {/* Services list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {services.map(svc => (
            <div key={svc.key} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <StatusDot status={checks[svc.key]} />
                <div>
                  <p className="font-medium text-sm text-gray-800">{svc.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{svc.desc}</p>
                </div>
              </div>
              <StatusLabel status={checks[svc.key]} />
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Para reportar incidencias, escríbenos a{' '}
          <a href="mailto:info@normalis.co" className="text-primary-500 hover:underline">
            info@normalis.co
          </a>
        </p>
      </main>
    </div>
  );
}
