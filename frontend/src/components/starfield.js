export function initStarfield() {
  const c = document.getElementById('stars');
  if (!c) return;
  const ctx = c.getContext('2d');

  const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
  resize();

  const stars = Array.from({ length: 140 }, () => ({
    x:  Math.random() * c.width,
    y:  Math.random() * c.height,
    r:  Math.random() * 1.2 + 0.2,
    a:  Math.random(),
    da: (Math.random() - 0.5) * 0.003,
  }));

  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    stars.forEach(s => {
      s.a = Math.max(0.05, Math.min(1, s.a + s.da));
      if (s.a <= 0.05 || s.a >= 1) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,245,255,${s.a * 0.35})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  draw();
  window.addEventListener('resize', resize);
}
