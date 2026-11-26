(() => {
  const background = document.querySelector('.hero-background');
  const photos = [...background.querySelectorAll('img')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let visible = true;
  let timer;
  let waiting = false;

  const shouldRotate = () => visible && !reduced.matches && !document.hidden;

  function schedule() {
    clearTimeout(timer);
    if (shouldRotate() && !waiting) timer = setTimeout(advance, 7200);
  }

  async function advance() {
    waiting = true;
    try {
      for (let step = 1; step < photos.length && shouldRotate(); step++) {
        const next = (current + step) % photos.length;
        try {
          await photos[next].decode();
        } catch {
          continue;
        }
        if (!shouldRotate()) break;
        for (const image of photos) delete image.dataset.exiting;
        photos[current].dataset.exiting = '';
        delete photos[current].dataset.current;
        photos[next].dataset.current = '';
        current = next;
        break;
      }
    } finally {
      waiting = false;
      schedule();
    }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }).observe(background);
  }
  reduced.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  schedule();
})();
