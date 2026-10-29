import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

export function SignaturePad({
  value,
  onSignatureChange,
  disabled = false,
}: {
  value?: string | null;
  onSignatureChange: (base64: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(Boolean(value));
  const dataUrlRef = useRef<string | null>(value || null);
  const [hasStroke, setHasStroke] = useState(Boolean(value));

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#0f172a';
    if (dataUrlRef.current) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = dataUrlRef.current;
    }
  }, []);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const coords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const point = coords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!point || !ctx) return;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    drawingRef.current = true;
  };

  const move = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const point = coords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!point || !ctx) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      setHasStroke(true);
    }
  };

  const stop = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasStrokeRef.current) {
      const dataUrl = canvas.toDataURL('image/png');
      dataUrlRef.current = dataUrl;
      onSignatureChange(dataUrl);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
    setHasStroke(false);
    dataUrlRef.current = null;
    onSignatureChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-44 w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-white dark:border-slate-600">
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-crosshair touch-none"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={(e) => {
            e.preventDefault();
            start(e);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            move(e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stop();
          }}
        />
        {!hasStroke && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <PenLine className="mb-1 h-5 w-5" />
            <p className="text-xs font-semibold">Traza tu firma con el dedo o el ratón</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <span>Firma electrónica simple</span>
        <button
          type="button"
          onClick={clear}
          disabled={!hasStroke || disabled}
          className="inline-flex min-h-11 items-center gap-1 font-medium text-slate-600 hover:text-rose-600 disabled:opacity-30 dark:text-slate-300"
        >
          <Eraser className="h-3.5 w-3.5" />
          Limpiar
        </button>
      </div>
    </div>
  );
}
