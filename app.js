import { initSplineScene } from './spline-scene.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a, b, n) => a + (b - a) * n;
const map = (v, a, b, c = 0, d = 1) => c + (d - c) * clamp((v - a) / (b - a));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let isMobile = innerWidth <= 800;
let frameCount = 0;


/* Preload the exact stone sequence used by the scroll scene. */
const stoneFrames = [];
const loaderBar = $('.loader-rail i');
const loaderCount = $('.loader-count');
let loadedAssets = 0;
const totalStone = isMobile ? 35 : 140;
const stoneStep = isMobile ? 4 : 1;
for (let i = 0; i < 140; i += stoneStep) {
  const img = new Image();
  const frame = String(i + 1).padStart(4, '0');
  img.src = `/assets/images/stone/frame_${frame}.webp`;
  const advance = () => {
    loadedAssets += 1;
    const n = Math.round((loadedAssets / totalStone) * 100);
    loaderBar.style.width = `${n}%`;
    loaderCount.textContent = String(n).padStart(3, '0');
  };
  img.onload = advance;
  img.onerror = advance;
  stoneFrames.push(img);
}

const finishLoad = () => {
  document.body.classList.add('loaded');
  loaderBar.style.width = '100%';
  loaderCount.textContent = '100';
  setTimeout(() => $('.loader').classList.add('done'), 260);
};
if (document.readyState === 'complete') setTimeout(finishLoad, reduceMotion ? 100 : 1150);
else window.addEventListener('load', () => setTimeout(finishLoad, reduceMotion ? 100 : 1150), { once: true });
const HMR_GUARD = setTimeout(finishLoad, 2500);

/* Cursor and magnetic controls. */
const cursor = $('.cursor');
let mouseX = innerWidth / 2;
let mouseY = innerHeight / 2;
let cursorX = mouseX;
let cursorY = mouseY;
window.addEventListener('pointermove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
window.addEventListener('pointerdown', () => cursor.classList.add('down'));
window.addEventListener('pointerup', () => cursor.classList.remove('down'));
$$('a,button,.project-image,.tilt').forEach((el) => {
  el.addEventListener('pointerenter', () => cursor.classList.add('hover'));
  el.addEventListener('pointerleave', () => cursor.classList.remove('hover'));
});
$$('.magnetic').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .16}px, ${(e.clientY - r.top - r.height / 2) * .16}px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

/* Full-screen menu transition. */
const menuButton = $('.menu-toggle');
const menuPanel = $('.menu-panel');
const closeMenu = () => {
  document.body.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuPanel.setAttribute('aria-hidden', 'true');
};
menuButton.addEventListener('click', () => {
  const open = !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuPanel.setAttribute('aria-hidden', String(!open));
});
$$('.menu-panel a').forEach((link) => link.addEventListener('click', closeMenu));

/* Optional synthesized interaction sound (no tracking, no autoplay). */
let soundOn = false;
let audioContext;
const soundButton = $('.sound');
const beep = (freq = 190, duration = .035) => {
  if (!soundOn) return;
  audioContext ||= new AudioContext();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(.035, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
  osc.connect(gain).connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
};
soundButton.addEventListener('click', () => {
  soundOn = !soundOn;
  soundButton.classList.toggle('on', soundOn);
  soundButton.setAttribute('aria-label', soundOn ? 'Disable sound' : 'Enable sound');
  if (soundOn) beep(260, .09);
});
$$('a,button').forEach((el) => el.addEventListener('pointerenter', () => beep(130 + Math.random() * 80)));

/* Hero line-field canvas. */
const hero = $('.hero');
const heroCanvas = $('#hero-canvas');
const hctx = heroCanvas.getContext('2d');
try { initSplineScene($('#spline-canvas'), '/assets/spline/hero.splinecode'); } catch (e) { console.error('Spline init failed:', e); }
let dpr = Math.min(devicePixelRatio || 1, 2);
let blastEnergy = 0;
let heroParticles = Array.from({ length: isMobile ? 28 : 55 }, () => ({
  x: Math.random(), y: Math.random(), z: Math.random(), vx: 0, vy: 0
}));
const resizeCanvas = (canvas, ctx) => {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};
const drawHero = (scroll) => {
  const w = heroCanvas.clientWidth;
  const h = heroCanvas.clientHeight;
  const local = clamp(scroll / Math.max(1, hero.offsetHeight));
  hctx.clearRect(0, 0, w, h);
  hctx.fillStyle = '#080909';
  hctx.fillRect(0, 0, w, h);

  const vx = w * (.51 + (mouseX / innerWidth - .5) * .035);
  const vy = h * (.52 + (mouseY / innerHeight - .5) * .035);
  hctx.lineWidth = .7;
  for (let i = -9; i < 13; i += 1) {
    const targetY = h * .1 + i * h * .085 + local * 140;
    const grad = hctx.createLinearGradient(0, targetY, w, targetY);
    grad.addColorStop(0, 'rgba(255,255,255,.02)');
    grad.addColorStop(.58, `rgba(187,165,138,${.10 + blastEnergy * .18})`);
    grad.addColorStop(1, 'rgba(255,255,255,.015)');
    hctx.strokeStyle = grad;
    hctx.beginPath();
    hctx.moveTo(-80, targetY + i * 24);
    hctx.quadraticCurveTo(vx, vy, w + 80, targetY - i * 34);
    hctx.stroke();
  }

  heroParticles.forEach((p) => {
    if (blastEnergy > .02) {
      const dx = p.x - .51;
      const dy = p.y - .52;
      p.vx += dx * .0008 * blastEnergy;
      p.vy += dy * .0008 * blastEnergy;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= .985;
    p.vy *= .985;
    if (p.x < -.1 || p.x > 1.1 || p.y < -.1 || p.y > 1.1) {
      p.x = .5 + (Math.random() - .5) * .15;
      p.y = .52 + (Math.random() - .5) * .15;
      p.vx = p.vy = 0;
    }
    const r = .3 + p.z * 1.4;
    hctx.fillStyle = `rgba(255,255,255,${.08 + p.z * .36})`;
    hctx.beginPath(); hctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2); hctx.fill();
  });

  blastEnergy *= .965;
};

let blastTimer;
const blastButton = $('.blast');
const startBlast = () => {
  blastButton.classList.add('charging');
  beep(80, .8);
  blastTimer = setTimeout(() => {
    blastEnergy = 1;
    hero.classList.add('blasted');
    setTimeout(() => hero.classList.remove('blasted'), 800);
  }, 820);
};
const cancelBlast = () => { clearTimeout(blastTimer); blastButton.classList.remove('charging'); };
blastButton.addEventListener('pointerdown', startBlast);
blastButton.addEventListener('pointerup', cancelBlast);
blastButton.addEventListener('pointerleave', cancelBlast);

/* Scroll reveals and active typography. */
const splitTarget = $('.word-reveal');
splitTarget.innerHTML = splitTarget.textContent.trim().split(/\s+/).map((w) => `<span class="word">${w}</span>`).join(' ');
const revealObserver = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)), { threshold: .16 });
$$('.reveal').forEach((el) => revealObserver.observe(el));
const countObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (!entry.isIntersecting || entry.target.dataset.done) return;
  entry.target.dataset.done = '1';
  const end = Number(entry.target.dataset.count);
  const start = performance.now();
  const tick = (now) => {
    const p = clamp((now - start) / 1500);
    entry.target.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { threshold: .6 });
$$('[data-count]').forEach((el) => countObserver.observe(el));

/* Card tilt. */
$$('.tilt').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const rx = (e.clientY - r.top) / r.height - .5;
    const ry = (e.clientX - r.left) / r.width - .5;
    card.style.transform = `rotateX(${-rx * 8}deg) rotateY(${ry * 9}deg)`;
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
});

/* Testimonial tabs. */
const clients = [
  { name: 'Malte Smith', role: 'Founder & CEO · USA', image: 'malte.webp', quote: "I've worked with Sunny and his team on several projects and he's one of the best UI/UX designers and front-end developers I know." },
  { name: 'Stephen Hart', role: 'Founder · United Kingdom', image: 'stephen.webp', quote: 'They absorbed a difficult brief, challenged it intelligently, and turned it into a confident digital presence that feels unmistakably ours.' },
  { name: 'Doug Goldstein', role: 'Product Lead · USA', image: 'doug.webp', quote: 'A rare team that moves quickly without losing the small details. The product now feels simpler, sharper, and significantly more credible.' },
  { name: 'Jean Claud', role: 'Managing Director · France', image: 'jean.webp', quote: 'From the first workshop to the final build, every decision had a reason. The result is beautiful, useful, and genuinely performs.' },
  { name: 'Zoltan Varga', role: 'Founder · Hungary', image: 'zoltan.webp', quote: 'TRIONN combines design instinct with technical precision. They felt less like a vendor and more like the missing half of our own team.' }
];
const quote = $('.quote-wrap blockquote');
const quoteName = $('.quote-wrap p b');
const quoteRole = $('.quote-wrap p span');
const quoteImage = $('.portrait img');
$$('.client-tabs button').forEach((button) => button.addEventListener('click', () => {
  const index = Number(button.dataset.client);
  const client = clients[index];
  $$('.client-tabs button').forEach((b) => b.classList.toggle('active', b === button));
  quoteImage.style.opacity = '0'; quote.style.opacity = '0';
  setTimeout(() => {
    quoteImage.src = `/assets/images/people/${client.image}`;
    quote.textContent = `“${client.quote}”`;
    quoteName.textContent = client.name;
    quoteRole.textContent = client.role;
    quoteImage.style.opacity = '1'; quote.style.opacity = '1';
  }, 230);
}));

/* Footer ambient canvas and live IST clock. */
const footerCanvas = $('#footer-canvas');
const fctx = footerCanvas.getContext('2d');
const drawFooter = () => {
  const w = footerCanvas.clientWidth;
  const h = footerCanvas.clientHeight;
  fctx.clearRect(0, 0, w, h);
  const mx = mouseX / innerWidth * w;
  const my = mouseY / innerHeight * h;
  for (let i = 0; i < 4; i += 1) {
    const x = (w * (.15 + i * .27) + mx * .08 * (i % 2 ? 1 : -1));
    const y = h * (.55 + Math.sin(Date.now() * .0003 + i) * .08) + my * .04;
    const g = fctx.createRadialGradient(x, y, 0, x, y, h * .28);
    g.addColorStop(0, `rgba(${i % 2 ? '43,55,74' : '85,81,75'},.22)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    fctx.fillStyle = g; fctx.fillRect(0, 0, w, h);
  }
};
const updateClock = () => {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  $('.footer-top time').textContent = time;
};
updateClock(); setInterval(updateClock, 30000);

/* Scroll choreography. */
const footer = $('footer');
const vision = $('.vision');
const visionBands = $$('.vision-bands i');
const visionWords = $('.vision-words');
const visionShard = $('.vision-shard');
const workSection = $('.work-scroll');
const workTrack = $('.work-track');
const services = $('.services');
const serviceSmoke = $('.service-smoke');
const stone = $('.stone');
const serviceTitle = $$('.service-title span');
const serviceCards = $$('.service-copy article');
const motionSection = $('.motion-scroll');
const motionRail = $('.motion-rail');
const motionHeading = $('.motion-heading');
let targetScroll = scrollY;
let smoothScroll = scrollY;
const offsets = {};
const cacheOffsets = () => {
  offsets.v = vision.offsetTop;
  offsets.vh = vision.offsetHeight;
  offsets.w = workSection.offsetTop;
  offsets.wh = workSection.offsetHeight;
  offsets.s = services.offsetTop;
  offsets.sh = services.offsetHeight;
  offsets.m = motionSection.offsetTop;
  offsets.mh = motionSection.offsetHeight;
  offsets.vSpans ||= $$('span', visionWords);
};

const sectionProgress = (top, height, y) => {
  const distance = height - innerHeight;
  return clamp((y - top) / Math.max(1, distance));
};

const updateScenes = () => {
  targetScroll = scrollY;
  smoothScroll = reduceMotion ? targetScroll : lerp(smoothScroll, targetScroll, isMobile ? .35 : .2);

  if (isMobile && ++frameCount % 2 !== 0) { requestAnimationFrame(updateScenes); return; }

  if (!isMobile) {
    cursorX = lerp(cursorX, mouseX, .22);
    cursorY = lerp(cursorY, mouseY, .22);
    cursor.style.transform = `translate(${cursorX}px,${cursorY}px) translate(-50%,-50%)`;
  }

  if (!isMobile && smoothScroll < innerHeight * 1.25) drawHero(smoothScroll);

  if (isMobile) {
    if (!splitTarget.dataset.wordsOn) { splitTarget.dataset.wordsOn = '1'; splitTarget.querySelectorAll('.word').forEach((w) => w.classList.add('on')); }
  } else {
    const aboutRect = splitTarget.getBoundingClientRect();
    const wordP = clamp((innerHeight * .82 - aboutRect.top) / (innerHeight * .72));
    const words = $$('.word', splitTarget);
    words.forEach((w, i) => w.classList.toggle('on', i / words.length < wordP));
  }

  const near = (top, height) => smoothScroll + innerHeight * .5 > top && smoothScroll < top + height + innerHeight * .5;

  if (near(offsets.v, offsets.vh)) {
    const vp = sectionProgress(offsets.v, offsets.vh, smoothScroll);
    visionBands.forEach((band, i) => {
      band.style.transform = `scaleX(${clamp(map(vp, .08 + i * .07, .45 + i * .07))})`;
      band.style.transformOrigin = i % 2 ? 'right' : 'left';
    });
    visionWords.style.transform = `translateX(${(vp - .5) * -76 * innerWidth / 100}px)`;
    const shardIn = clamp(vp * 6);
    visionShard.style.transform = isMobile
      ? `translateY(${(1 - shardIn) * 120}px) scale(${.75 + vp * .55})`
      : `perspective(600px) translateY(${(1 - shardIn) * 120}px) rotateY(${25 + vp * 245}deg) rotateX(${vp * 28}deg) scale(${.75 + vp * .55})`;
    visionShard.style.opacity = String(shardIn);
  }

  if (!isMobile) {
    const wp = sectionProgress(offsets.w, offsets.wh, smoothScroll);
    const maxX = Math.max(0, workTrack.scrollWidth - innerWidth);
    workTrack.style.transform = `translate3d(${-wp * maxX}px,0,0)`;
  }

  if (near(offsets.s, offsets.sh)) {
    const sp = sectionProgress(offsets.s, offsets.sh, smoothScroll);
    const maxFrame = stoneFrames.length - 1;
    const frame = Math.min(maxFrame, Math.floor(sp * maxFrame));
    if (stoneFrames[frame]?.complete && stone.dataset.frame !== frame) {
      stone.dataset.frame = frame;
      stone.src = stoneFrames[frame].src;
    }
    serviceTitle.forEach((line, i) => {
      const spread = (i - 1.5) * map(sp, .12, .33, 0, 46);
      line.style.transform = `translateX(${spread * innerWidth / 100}px)`;
      line.style.opacity = String(clamp(map(sp, .34, .22)));
    });
    serviceCards.forEach((card, i) => {
      const center = .34 + i * .12;
      const enter = map(sp, center - .07, center, 0, 1);
      const leave = 1 - map(sp, center + .08, center + .15, 0, 1);
      const opacity = clamp(enter * leave);
      card.style.opacity = opacity;
      card.style.transform = `translateY(${(1 - opacity) * 30}px)`;
    });
    stone.style.opacity = String(clamp(map(sp, .16, .28)) * clamp(map(sp, .94, .76)));
    stone.style.transform = `scale(${.9 + sp * .22})`;
  }

  if (near(offsets.m, offsets.mh)) {
    const mp = sectionProgress(offsets.m, offsets.mh, smoothScroll);
    const motionMax = Math.max(0, motionRail.scrollWidth - innerWidth * .05);
    motionRail.style.transform = `translate3d(${-mp * motionMax}px,0,0)`;
  }

  if (!isMobile) {
    const footerTop = footer.getBoundingClientRect().top;
    if (footerTop < innerHeight * 1.5) drawFooter();
  }
  requestAnimationFrame(updateScenes);
};

const resize = () => {
  dpr = Math.min(devicePixelRatio || 1, 2);
  resizeCanvas(heroCanvas, hctx);
  resizeCanvas(footerCanvas, fctx);
  cacheOffsets();
  isMobile = innerWidth <= 800;
};
addEventListener('resize', resize);
resize();
cacheOffsets();
requestAnimationFrame(updateScenes);
if (isMobile && serviceSmoke) {
  let smokeTick;
  const syncSmoke = () => { smokeTick = 0;
    const y = pageYOffset, t = offsets.s, h = offsets.sh;
    serviceSmoke[y + innerHeight * .5 > t && y < t + h + innerHeight * .5 ? 'play' : 'pause']();
  };
  addEventListener('scroll', () => { if (!smokeTick) smokeTick = requestAnimationFrame(syncSmoke); }, { passive: true });
}

/* Smooth anchor intent without hijacking normal wheel/touch scrolling. */
$$('a[href^="#"]').forEach((link) => link.addEventListener('click', (e) => {
  const target = $(link.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}));
