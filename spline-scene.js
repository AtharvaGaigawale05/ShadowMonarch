import { Application } from '@splinetool/runtime';

export function initSplineScene(canvas, sceneUrl) {
  const origAdd = canvas.addEventListener.bind(canvas);
  canvas.addEventListener = (type, fn, opt) => {
    if (type === 'wheel' || type === 'touchstart' || type === 'touchmove' || type === 'pointerdown')
      origAdd(type, fn, { passive: true, ...(typeof opt === 'object' ? opt : {}) });
    else origAdd(type, fn, opt);
  };

  const fallback = () => {
    if (canvas.dataset.splineOk) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w; canvas.height = h;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0a0a1a'); grad.addColorStop(.5, '#1a1a2e'); grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(255,255,255,${.02 + Math.random() * .04})`;
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + .5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = .5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(Math.random() * w, 0); ctx.lineTo(Math.random() * w, h); ctx.stroke();
    }
    canvas.classList.add('spline-ready');
  };

  let app;
  try {
    app = new Application(canvas);
    app.load(sceneUrl)
      .then(() => {
        canvas.dataset.splineOk = '1';
        canvas.classList.add('spline-ready');
        canvas.dispatchEvent(new CustomEvent('spline-ready', { detail: { app } }));
      })
      .catch((error) => {
        console.error('Unable to load the Spline hero scene.', error);
        fallback();
      });
    setTimeout(fallback, 5000);
  } catch (e) {
    console.error('Spline Application constructor failed:', e);
    fallback();
  }

  return app;
}
