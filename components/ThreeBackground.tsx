'use client';

import { useEffect, useRef } from 'react';

export default function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    // ── Pure canvas 2D fluid aurora (zero extra deps, looks like Three.js fluid) ──
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    let raf = 0;
    let t = 0;
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    // Blob config — like blobmixer
    const BLOBS = [
      { x: 0.15, y: 0.2,  vx: 0.0003, vy: 0.00025, r: 0.38, color: [245, 130, 20] },
      { x: 0.75, y: 0.15, vx:-0.00025, vy: 0.0003,  r: 0.42, color: [30, 100, 240] },
      { x: 0.5,  y: 0.7,  vx: 0.0002,  vy:-0.0002,  r: 0.35, color: [150, 60, 230] },
      { x: 0.85, y: 0.65, vx:-0.0003,  vy:-0.00025, r: 0.32, color: [20, 180, 140] },
      { x: 0.3,  y: 0.85, vx: 0.00028, vy: 0.0002,  r: 0.3,  color: [245, 166, 35] },
    ];

    // Noise-like smooth oscillators for organic motion
    const OSC = BLOBS.map((_, i) => ({
      ox: Math.random() * Math.PI * 2,
      oy: Math.random() * Math.PI * 2,
      sx: 0.12 + Math.random() * 0.1,
      sy: 0.10 + Math.random() * 0.1,
      speed: 0.0004 + i * 0.00006,
    }));

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    function draw() {
      t += 0.6;

      // Smooth mouse follow
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      ctx.clearRect(0, 0, W, H);

      // Deep background
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.max(W, H) * 0.8);
      bg.addColorStop(0, 'rgba(8,16,36,1)');
      bg.addColorStop(1, 'rgba(3,5,12,1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Draw each blob with compositing for fluid mixing
      ctx.globalCompositeOperation = 'screen';

      BLOBS.forEach((blob, i) => {
        const osc = OSC[i];

        // Organic position with Lissajous-style oscillation
        const bx = (blob.x + Math.sin(t * osc.speed + osc.ox) * osc.sx + (mouse.x - 0.5) * 0.06) * W;
        const by = (blob.y + Math.cos(t * osc.speed * 1.3 + osc.oy) * osc.sy + (mouse.y - 0.5) * 0.04) * H;
        const br = blob.r * Math.min(W, H);

        // Pulse radius
        const pr = br * (0.92 + Math.sin(t * 0.008 + i * 1.1) * 0.08);

        const g = ctx.createRadialGradient(bx, by, 0, bx, by, pr);
        const [r, g2, b] = blob.color;
        g.addColorStop(0,   `rgba(${r},${g2},${b},0.22)`);
        g.addColorStop(0.4, `rgba(${r},${g2},${b},0.10)`);
        g.addColorStop(0.75,`rgba(${r},${g2},${b},0.03)`);
        g.addColorStop(1,   `rgba(${r},${g2},${b},0)`);

        ctx.beginPath();
        ctx.arc(bx, by, pr, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';

      // Thin moving grid lines — depth effect
      ctx.globalAlpha = 0.025;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;

      const spacing = 70;
      const shift = (t * 0.18) % spacing;
      for (let x = -spacing + (shift % spacing); x < W + spacing; x += spacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * 0.15, H); ctx.stroke();
      }
      for (let y = -spacing + (shift % spacing); y < H + spacing; y += spacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + W * 0.015); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Subtle scanlines
      ctx.globalAlpha = 0.018;
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, y, W, 1);
      }
      ctx.globalAlpha = 1;

      // Vignette
      const vig = ctx.createRadialGradient(W*0.5, H*0.5, H*0.2, W*0.5, H*0.5, H*0.85);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    }

    const onMove = (e: MouseEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = e.clientY / window.innerHeight;
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouse.tx = e.touches[0].clientX / window.innerWidth;
        mouse.ty = e.touches[0].clientY / window.innerHeight;
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });

    resize();
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="bg-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}