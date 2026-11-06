(() => {
  const plot = document.querySelector('.research-threads-plot');
  if (!plot) return;

  const start = Number(plot.dataset.start);
  const end = Number(plot.dataset.end);
  const center = Number(plot.dataset.center);
  const amplitude = Number(plot.dataset.amplitude);
  const phaseStart = Number(plot.dataset.phaseStart);
  const phaseLinear = Number(plot.dataset.phaseLinear);
  const phaseQuadratic = Number(plot.dataset.phaseQuadratic);
  const dots = Object.fromEntries(
    [...plot.querySelectorAll('[data-thread-dot]')].map(dot => [dot.dataset.threadDot, dot])
  );
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let position = Number(plot.getAttribute('aria-valuenow')) / 100;
  let target = position;
  let frame = null;
  let previousTime = null;
  let activePointer = null;

  // Preserve round, 5px markers when the responsive SVG scales unevenly.
  function sizeMarkers() {
    const matrix = plot.getScreenCTM();
    if (!matrix) return;
    const scaleX = Math.hypot(matrix.a, matrix.b);
    const scaleY = Math.hypot(matrix.c, matrix.d);
    if (!scaleX || !scaleY) return;
    Object.values(dots).forEach(dot => {
      dot.setAttribute('rx', String(5 / scaleX));
      dot.setAttribute('ry', String(5 / scaleY));
    });
  }

  function draw() {
    const x = start + position * (end - start);
    const phase = 2 * Math.PI * (phaseStart + phaseLinear * position + phaseQuadratic * position * position);
    const offset = amplitude * Math.sin(phase);
    dots.core.setAttribute('transform', `translate(${x} ${center})`);
    dots.hci.setAttribute('transform', `translate(${x} ${center + offset})`);
    dots.genai.setAttribute('transform', `translate(${x} ${center - offset})`);
  }

  function animate(time) {
    const delta = previousTime === null ? 16 : Math.min(time - previousTime, 64);
    previousTime = time;
    position += (target - position) * (1 - Math.exp(-delta / 65));
    if (Math.abs(target - position) < 0.0001) position = target;
    draw();
    if (position !== target) {
      frame = requestAnimationFrame(animate);
    } else {
      frame = null;
      previousTime = null;
    }
  }

  function moveTo(value) {
    target = Math.max(0, Math.min(1, value));
    plot.setAttribute('aria-valuenow', String(Math.round(target * 100)));
    if (reducedMotion.matches) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
      position = target;
      draw();
    } else if (frame === null) {
      frame = requestAnimationFrame(animate);
    }
  }

  function followPointer(event) {
    const matrix = plot.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    moveTo((point.x - start) / (end - start));
  }

  plot.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerId === activePointer) {
      followPointer(event);
    }
  });
  plot.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    activePointer = event.pointerId;
    plot.setPointerCapture(event.pointerId);
    followPointer(event);
  });
  function endPointer(event) {
    if (event.pointerId === activePointer) activePointer = null;
  }
  plot.addEventListener('pointerup', endPointer);
  plot.addEventListener('pointercancel', endPointer);
  plot.addEventListener('lostpointercapture', endPointer);

  plot.addEventListener('keydown', event => {
    const positions = {
      ArrowLeft: target - 0.04,
      ArrowDown: target - 0.04,
      ArrowRight: target + 0.04,
      ArrowUp: target + 0.04,
      PageDown: target - 0.1,
      PageUp: target + 0.1,
      Home: 0,
      End: 1
    };
    if (!(event.key in positions)) return;
    event.preventDefault();
    moveTo(positions[event.key]);
  });
  reducedMotion.addEventListener('change', () => moveTo(target));
  new ResizeObserver(sizeMarkers).observe(plot);
  sizeMarkers();
  draw();
})();
