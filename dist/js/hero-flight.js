document.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector('.hero-title');
  const robot = title.querySelector('.hero-robot');
  const head = robot.querySelector('.hero-robot-head');
  const lines = title.querySelectorAll('[data-letters]');
  const peekLetter = [...lines[0].querySelectorAll('.hero-letter')].find(letter => letter.textContent.toLowerCase() === 'o');
  const bumpLetter = lines[1].querySelector('.hero-letter');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 15400;
  let animations = [];

  // Sample a spline through the poses so the robot banks smoothly between beats.
  function interpolate(before, start, end, after, amount) {
    const incoming = (end - before) * .45;
    const outgoing = (after - start) * .45;
    const squared = amount * amount;
    const cubed = squared * amount;
    return start + incoming * amount
      + (3 * (end - start) - 2 * incoming - outgoing) * squared
      + (2 * (start - end) + incoming + outgoing) * cubed;
  }

  function playFlight() {
    const previousTime = animations[0]?.currentTime ?? 0;
    animations.forEach(animation => animation.cancel());
    animations = [];
    if (reduceMotion.matches || !peekLetter || !bumpLetter || !robot.animate) {
      delete robot.dataset.flying;
      return;
    }

    const area = title.getBoundingClientRect();
    const peek = peekLetter.getBoundingClientRect();
    const bump = bumpLetter.getBoundingClientRect();
    const size = robot.offsetWidth;
    const peekX = peek.left - area.left + peek.width / 2;
    const peekY = peek.top - area.top + peek.height * .57;
    const peekScale = Math.min(.46, peek.width * .71 / size);
    const bumpX = bump.right - area.left + size * .28;
    const bumpY = bump.top - area.top + bump.height * .58;
    const w = title.clientWidth;
    const h = title.clientHeight;

    // Each pose is timed independently: entry, curiosity, impact, recoil and exit.
    const poses = [
      {time:0, x:w*.9, y:-size*.55, angle:22, scale:.54, opacity:0},
      {time:.09, x:w*.81, y:h*.46, angle:-19, scale:.95, opacity:1},
      {time:.18, x:w*.49, y:h*.55, angle:-20, scale:.91, opacity:1},
      {time:.25, x:peekX+size*.6, y:peekY-size*.46, angle:12, scale:.72, opacity:1},
      {time:.31, x:peekX, y:peekY+size*.21*peekScale, angle:0, scale:peekScale, opacity:1, clipped:1},
      {time:.39, x:peekX, y:peekY+size*.21*peekScale, angle:0, scale:peekScale, opacity:1, clipped:1},
      {time:.45, x:peekX-size*.36, y:h*.26, angle:-21, scale:.73, opacity:1},
      {time:.54, x:w*.50, y:h*.80, angle:25, scale:.99, opacity:1},
      {time:.61, x:bumpX+size*.58, y:bumpY+size*.28, angle:-18, scale:1, opacity:1},
      {time:.66, x:bumpX, y:bumpY, angle:-30, scale:.94, opacity:1},
      {time:.695, x:bumpX+size*.88, y:bumpY-size*.55, angle:31, scale:1.05, opacity:1},
      {time:.75, x:bumpX+size*.70, y:bumpY-size*.36, angle:-19, scale:.94, opacity:1},
      {time:.81, x:w*.55, y:h*.56, angle:13, scale:.87, opacity:1},
      {time:.93, x:w*.87, y:h*.10, angle:27, scale:.66, opacity:.92},
      {time:1, x:w*.90, y:-size*.55, angle:22, scale:.54, opacity:0}
    ];

    const frames = [];
    for (let index = 0; index < poses.length - 1; index++) {
      const start = poses[index];
      const end = poses[index + 1];
      const before = poses[index - 1] ?? start;
      const after = poses[index + 2] ?? end;
      for (let sample = 0; sample <= 8; sample++) {
        if (sample === 8 && index < poses.length - 2) continue;
        const amount = sample / 8;
        // The pose stays still while the robot's eyes peer through the letter.
        const read = key => start.clipped && end.clipped ? start[key] :
          interpolate(before[key], start[key], end[key], after[key], amount);
        frames.push({
          offset: start.time + (end.time - start.time) * amount,
          transform: `translate3d(${read('x') - size / 2}px,${read('y') - size / 2}px,0) rotate(${read('angle')}deg) scale(${read('scale')})`,
          opacity: start.opacity + (end.opacity - start.opacity) * amount,
          clipPath: `inset(0 0 ${44 * ((start.clipped ?? 0) * (1 - amount) + (end.clipped ?? 0) * amount)}% 0)`
        });
      }
    }

    const timing = {duration, iterations: Infinity};
    animations = [
      robot.animate(frames, timing),
      bumpLetter.animate([
        {offset:0, transform:'none'},
        {offset:.66, transform:'none'},
        {offset:.677, transform:'translateX(-6px) rotate(-11deg)', color:'#9bcfff'},
        {offset:.70, transform:'rotate(6deg)'},
        {offset:.73, transform:'none'},
        {offset:1, transform:'none'}
      ], timing),
      head.animate([
        {offset:0, scale:'1 1'},
        {offset:.342, scale:'1 1'},
        {offset:.349, scale:'1 .58'},
        {offset:.357, scale:'1 1'},
        {offset:.66, scale:'1 1'},
        {offset:.678, scale:'1.15 1.11'},
        {offset:.71, scale:'1 1'},
        {offset:1, scale:'1 1'}
      ], timing)
    ];
    const startTime = document.timeline.currentTime - previousTime;
    animations.forEach(animation => { animation.startTime = startTime; });
    robot.dataset.flying = '';
  }

  playFlight();
  new ResizeObserver(playFlight).observe(title);
  reduceMotion.addEventListener('change', playFlight);
});
