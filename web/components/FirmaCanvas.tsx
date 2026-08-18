'use client';

/**
 * web/components/FirmaCanvas.tsx
 * Captura de firma manuscrita en pantalla (mouse/táctil) para consentimientos
 * informados — se exporta como PNG (dataURL) para vincularla a la firma
 * electrónica del documento (ver web/lib/firmar.ts).
 */

import { useRef, useState, useCallback, useEffect } from 'react';

interface FirmaCanvasProps {
  onChange: (dataUrl: string | null) => void;
  width?:  number;
  height?: number;
}

export default function FirmaCanvas({ onChange, width = 400, height = 150 }: FirmaCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const drawing    = useRef(false);
  const hasStroke  = useRef(false);
  const [empty, setEmpty] = useState(true);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Escala para pantallas de alta densidad sin perder nitidez del trazo
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth   = 2;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.strokeStyle = '#1e293b';
    }
  }, [width, height]);

  function pos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStroke.current = true;
    if (empty) setEmpty(false);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    emit();
  }

  function emit() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke.current) { onChange(null); return; }
    onChange(canvas.toDataURL('image/png'));
  }

  function limpiar() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke.current = false;
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="space-y-1.5">
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width, height, touchAction: 'none', display: 'block' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {empty && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 pointer-events-none">
            Firma aquí con el mouse o el dedo
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={limpiar}
          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
        >
          Limpiar firma
        </button>
      </div>
    </div>
  );
}
