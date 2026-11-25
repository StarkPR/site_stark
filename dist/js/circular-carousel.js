(() => {
  const wrap = (value, length) => ((value % length) + length) % length;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  function circularCarousel(stage, {onChange, onMove, interval = 0, canRotate = () => true, canAutoSelect}) {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let cards = [];
    let position = 0;
    let current = -1;
    let destination = null;
    let frame = 0;
    let timer = 0;
    let drag;
    let suppressClick = false;
    let visible = !('IntersectionObserver' in window);
    let autoplay = false;
    let automaticMove = false;

    function offset(index) {
      const half = cards.length / 2;
      return wrap(index - position + half, cards.length) - half;
    }

    function paint() {
      const count = cards.length;
      if (!count) return;
      const radius = stage.clientWidth * .39;
      const nearest = wrap(Math.round(position), count);
      const active = automaticMove && canAutoSelect && !canAutoSelect(nearest) ? current : nearest;
      onMove?.(offset, automaticMove);
      cards.forEach((card, index) => {
        const distance = offset(index);
        const angle = distance * 2 * Math.PI / count;
        const facing = Math.cos(angle);
        const isActive = index === active;
        const inFront = isActive || (Math.abs(distance) < 1.52 && facing > -.26);
        card.style.transform = `translate3d(${radius * Math.sin(angle)}px,0,${radius * (facing - 1)}px) rotateY(${angle * 35}deg)`;
        card.style.opacity = inFront ? String(isActive ? 1 : .30 + Math.max(0, facing) * .47) : '0';
        card.style.visibility = inFront ? 'visible' : 'hidden';
        card.style.zIndex = String(isActive ? 3 : 2);
        card.toggleAttribute('data-centered', isActive);
        if (!isActive && card.contains(document.activeElement)) stage.focus({preventScroll:true});
        card.setAttribute('aria-hidden', String(!isActive));
        for (const control of card.querySelectorAll('button,a,video')) {
          control.tabIndex = isActive ? 0 : -1;
        }
      });
      if (active !== current) {
        current = active;
        onChange(active);
      }
    }

    function schedule() {
      clearTimeout(timer);
      if (autoplay && interval && visible && !document.hidden && !motion.matches &&
          cards.length > 1 && destination === null && !drag &&
          !stage.matches(':hover') && !stage.contains(document.activeElement) && canRotate()) {
        timer = setTimeout(advanceAutomatically, interval);
      }
    }

    function stopMotion() {
      cancelAnimationFrame(frame);
      frame = 0;
      destination = null;
      automaticMove = false;
      clearTimeout(timer);
    }

    function animateTo(target, automatic = false) {
      stopMotion();
      automaticMove = automatic;
      if (motion.matches || target === position) {
        position = wrap(target, cards.length);
        paint();
        automaticMove = false;
        schedule();
        return;
      }
      const previous = position;
      const start = performance.now();
      const duration = 430 + Math.min(200, Math.abs(target - position) * 70);
      destination = target;
      function tick(now) {
        const progress = clamp((now - start) / duration, 0, 1);
        position = previous + (target - previous) * (1 - (1 - progress) ** 4);
        if (progress < 1) {
          paint();
          frame = requestAnimationFrame(tick);
        } else {
          position = wrap(target, cards.length);
          frame = 0;
          destination = null;
          paint();
          automaticMove = false;
          schedule();
        }
      }
      frame = requestAnimationFrame(tick);
    }

    function step(direction) {
      if (cards.length > 1) animateTo(Math.round(destination ?? position) + direction);
    }

    function advanceAutomatically() {
      const start = Math.round(position);
      for (let step = 1; step < cards.length; step++) {
        const target = start + step;
        if (!canAutoSelect || canAutoSelect(wrap(target, cards.length))) {
          animateTo(target, true);
          return;
        }
      }
    }

    function goTo(index) {
      if (cards[index]) animateTo(Math.round(position + offset(index)));
    }

    stage.addEventListener('pointerdown', event => {
      suppressClick = false;
      if (cards.length < 2 || drag || event.button !== 0 || event.target.closest('video[controls]')) return;
      stopMotion();
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, origin:position, samples:[], moved:false};
    });
    stage.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const x = event.clientX - drag.x;
      const y = event.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(x) < 6 || Math.abs(x) <= Math.abs(y)) return;
        drag.moved = true;
        stage.setPointerCapture(event.pointerId);
        stage.dataset.dragging = '';
      }
      const spacing = Math.max(65, stage.clientWidth * .45);
      position = drag.origin - x / spacing;
      drag.samples = drag.samples.filter(sample => event.timeStamp - sample.time < 100);
      drag.samples.push({position, time:event.timeStamp});
      paint();
    });

    function release(event) {
      if (drag?.id !== event.pointerId) return;
      const first = drag.samples[0];
      const elapsed = first ? event.timeStamp - first.time : 0;
      const velocity = drag.moved && elapsed > 0 && elapsed < 115 && event.type === 'pointerup'
        ? clamp((position - first.position) / elapsed * 115, -1.25, 1.25)
        : 0;
      suppressClick = drag.moved;
      delete stage.dataset.dragging;
      drag = null;
      animateTo(Math.round(position + velocity));
    }
    for (const name of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(name, release);
    stage.addEventListener('pointerleave', event => {
      if (drag && !drag.moved) release(event);
      schedule();
    });
    stage.addEventListener('click', event => {
      if (suppressClick && event.detail !== 0) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
        return;
      }
      const index = cards.indexOf(event.target.closest('.circular-card'));
      if (index < 0 || index === current) return;
      event.preventDefault();
      event.stopPropagation();
      goTo(index);
    }, true);
    stage.addEventListener('keydown', event => {
      if (event.target.closest('video') || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    });
    stage.addEventListener('pointerenter', schedule);
    stage.addEventListener('focusin', schedule);
    stage.addEventListener('focusout', () => queueMicrotask(schedule));
    stage.addEventListener('dragstart', event => event.preventDefault());
    motion.addEventListener('change', () => {
      if (destination !== null && motion.matches) animateTo(destination);
      schedule();
    });
    document.addEventListener('visibilitychange', schedule);
    if ('ResizeObserver' in window) new ResizeObserver(paint).observe(stage);
    else window.addEventListener('resize', paint);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        schedule();
      }).observe(stage);
    }

    return {
      step,
      goTo,
      schedule,
      replace(nextCards) {
        stopMotion();
        drag = null;
        suppressClick = false;
        delete stage.dataset.dragging;
        cards = nextCards;
        position = 0;
        current = -1;
        stage.replaceChildren(...cards);
        paint();
        schedule();
      },
      setPlaying(playing) {
        autoplay = playing;
        schedule();
      }
    };
  }

  window.STARK_CAROUSEL = circularCarousel;
})();
