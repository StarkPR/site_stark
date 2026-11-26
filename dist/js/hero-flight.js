document.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector('.hero-title');
  const robot = title.querySelector('.hero-robot');
  const dock = robot.parentElement;
  const head = robot.querySelector('.hero-robot-head');
  const lines = title.querySelectorAll('[data-letters]');
  const peekLetter = [...lines[0].querySelectorAll('.hero-letter')].find(letter => letter.textContent.toLowerCase() === 'o');
  const bumpLetter = lines[1].querySelector('.hero-letter');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 15400;
  const rejoinTime = .18;
  let animations = [];
  let drag = null;
  let returnFrame = null;

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const cruisePose = (width, height) => ({x:width*.49, y:height*.55, angle:-20, scale:.91});
  const poseTransform = ({x, y, angle, scale}, size) =>
    `translate3d(${x-size/2}px,${y-size/2}px,0) rotate(${angle}deg) scale(${scale})`;

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

  function playFlight(previousTime = animations[0]?.currentTime ?? 0) {
    if (robot.hasAttribute('data-detached')) return;
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
      {time:rejoinTime, ...cruisePose(w,h), opacity:1},
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
        const opacity = start.opacity + (end.opacity - start.opacity) * amount;
        frames.push({
          offset: start.time + (end.time - start.time) * amount,
          transform: poseTransform({x:read('x'), y:read('y'), angle:read('angle'), scale:read('scale')}, size),
          opacity,
          pointerEvents: opacity < .18 ? 'none' : 'auto',
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

  function dockRobot() {
    if (returnFrame !== null) cancelAnimationFrame(returnFrame);
    returnFrame = null;
    drag = null;
    delete robot.dataset.detached;
    delete robot.dataset.grabbed;
    robot.style.removeProperty('transform');
    dock.append(robot);
    playFlight(duration * rejoinTime);
  }

  function place(x, y, angle = 0, scale = 1) {
    robot.style.transform = poseTransform({x, y, angle, scale}, robot.offsetWidth);
  }

  robot.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag || reduceMotion.matches || Number(getComputedStyle(robot).opacity) < .18) return;
    event.preventDefault();
    const box = robot.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    if (returnFrame !== null) cancelAnimationFrame(returnFrame);
    returnFrame = null;
    animations.forEach(animation => animation.cancel());
    animations = [];
    robot.dataset.detached = '';
    robot.dataset.grabbed = '';
    if (robot.parentElement !== document.body) document.body.append(robot);
    drag = {id:event.pointerId, x, y, dx:x-event.clientX, dy:y-event.clientY, history:[{x, y, time:event.timeStamp}]};
    place(x, y);
    robot.setPointerCapture(event.pointerId);
  });

  robot.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const x = clamp(event.clientX + drag.dx, 10, innerWidth - 10);
    const y = clamp(event.clientY + drag.dy, 10, innerHeight - 10);
    place(x, y, clamp((x - drag.x) * .8, -26, 26));
    drag.x = x;
    drag.y = y;
    drag.history = drag.history.filter(sample => event.timeStamp - sample.time <= 110);
    drag.history.push({x, y, time:event.timeStamp});
  });

  function release(event) {
    if (drag?.id !== event.pointerId) return;
    const {x, y, history} = drag;
    drag = null;
    delete robot.dataset.grabbed;
    const sample = history[0];
    const age = event.timeStamp - sample.time;
    const flick = event.type === 'pointerup' && age > 0 && age <= 130;
    const vx = flick ? clamp((x - sample.x) / age, -2, 2) : 0;
    const vy = flick ? clamp((y - sample.y) / age, -2, 2) : 0;
    const drift = Math.min(230, Math.hypot(vx, vy) * 115);
    const edge = 22;
    const driftX = clamp(x + vx * drift * .36, edge, innerWidth - edge);
    const driftY = clamp(y + vy * drift * .36, edge, innerHeight - edge);
    const released = performance.now();

    function returnToTitle(now) {
      const elapsed = Math.max(0, now - released);
      if (elapsed < drift) {
        const time = 1 - (1 - elapsed / drift) ** 2;
        place(x + (driftX - x) * time, y + (driftY - y) * time, vx * 16 * (1 - time));
      } else {
        const box = title.getBoundingClientRect();
        const pose = cruisePose(box.width, box.height);
        const targetX = box.left + pose.x;
        const targetY = box.top + pose.y;
        const time = clamp((elapsed - drift) / 850, 0, 1);
        const ease = time * time * (3 - 2 * time);
        const arc = Math.sin(time * Math.PI) * Math.min(110, Math.hypot(targetX - driftX, targetY - driftY) * .24);
        place(
          driftX + (targetX - driftX) * ease,
          driftY + (targetY - driftY) * ease - arc,
          pose.angle * ease + Math.sign(targetX - driftX) * 20 * Math.sin(time * Math.PI),
          1 + (pose.scale - 1) * ease
        );
        if (time === 1) {
          dockRobot();
          return;
        }
      }
      returnFrame = requestAnimationFrame(returnToTitle);
    }
    returnFrame = requestAnimationFrame(returnToTitle);
  }

  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    robot.addEventListener(event, release);
  }

  playFlight();
  new ResizeObserver(() => playFlight()).observe(title);
  reduceMotion.addEventListener('change', () => {
    if (robot.hasAttribute('data-detached')) dockRobot();
    else playFlight();
  });
});
