// CAD DO ROBÔ — substitua null pelo caminho de uma malha OBJ com faces.
// Exemplo: const ARQUIVO_CAD = 'assets/robo/chassi.obj';
// A tela cheia usa os nomes de objeto (o) ou de grupo (g) do OBJ para identificar peças.
const ARQUIVO_CAD = null;
(() => {
  const cube = {
    points: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    parts: ['Face traseira','Face frontal','Face esquerda','Face direita','Face superior','Face inferior'],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]]
  };
  function parseObj(source) {
    const points = [], faces = [], parts = [];
    let object = 'Modelo', group = '';
    for (const line of source.split(/\r?\n/)) {
      const [kind, ...values] = line.split('#')[0].trim().split(/\s+/);
      if (kind === 'v') points.push(values.slice(0, 3).map(Number));
      if (kind === 'o') { object = values.join(' ') || 'Modelo'; group = ''; }
      if (kind === 'g') group = values.join(' ');
      if (kind === 'f') {
        faces.push(values.map(v => { const n = Number(v.split('/')[0]); return n < 0 ? points.length + n : n - 1; }));
        parts.push(group && object !== 'Modelo' ? object + ' / ' + group : group || object);
      }
    }
    if (!points.length || !faces.length || points.some(v => v.length !== 3 || !v.every(Number.isFinite)) ||
        faces.some(f => f.length < 3 || f.some(i => !Number.isInteger(i) || !points[i]))) throw Error('Malha OBJ inválida');
    const lo = [Infinity,Infinity,Infinity], hi = [-Infinity,-Infinity,-Infinity];
    points.forEach(v => v.forEach((n,i) => { lo[i] = Math.min(lo[i],n); hi[i] = Math.max(hi[i],n); }));
    const span = Math.max(...hi.map((n,i) => n-lo[i])) || 1;
    return {points:points.map(p => p.map((n,i) => (2*n-lo[i]-hi[i])/span)), faces, parts};
  }
  let model = cube;
  const displays = [];
  function setup(canvas, inspector = false) {
    const dialog = document.querySelector('#cad-dialog');
    const selector = document.querySelector('#cad-part');
    const spinButton = document.querySelector('#cad-spin');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let spinning = !reduce.matches, selected = '', hits = [], pivot = [0,0,0];
    let previous = 0, flight = null;
    function setSpin(enabled) {
      spinning = enabled;
      previous = 0;
      if (inspector) spinButton.textContent = window.STARK_UI.t(enabled ? 'Pausar rotação' : 'Girar modelo');
      draw();
    }
    const ctx = canvas.getContext('2d');
    let yaw, pitch, zoom, drag, scheduled = false;
    function reset() { yaw = -.69; pitch = .43; zoom = 1; pivot = [0,0,0]; flight = null; selected = '';
      if (inspector) selector.value = '';
      draw(); }
    function draw() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(time => {
        scheduled = false;
        if (inspector && (!dialog.open || document.hidden)) { previous = 0; return; }
        if (flight) {
          const f = Math.min(1, (time - flight.start) / 360);
          const ease = 1 - (1 - f) ** 3;
          pivot = flight.from.map((v,i) => v + (flight.to[i] - v) * ease);
          zoom = flight.z0 + (flight.z1 - flight.z0) * ease;
          yaw = flight.y0 + (flight.y1 - flight.y0) * ease;
          pitch = flight.p0 + (flight.p1 - flight.p0) * ease;
          if (f >= 1) flight = null;
        } else if (inspector && spinning && !drag) {
          if (previous) yaw += Math.min(time - previous, 70) * .00023;
          previous = time;
        }
        paint();
        if (inspector && (flight || (spinning && !drag))) draw();
      });
    }
    function paint() {
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if (!w || !h) return;
      const dpi = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(w*dpi)) canvas.width = Math.round(w*dpi);
      if (canvas.height !== Math.round(h*dpi)) canvas.height = Math.round(h*dpi);
      ctx.setTransform(dpi,0,0,dpi,0,0);
      ctx.clearRect(0,0,w,h);
      const cx=w*.5,cy=h*.487,s=Math.min(w*.205,h*.238)*zoom;
      const c=Math.cos(yaw),t=Math.sin(yaw),p=Math.cos(pitch),q=Math.sin(pitch);
      function project([x,y,z]) { x-=pivot[0];y-=pivot[1];z-=pivot[2]; const depth=-x*t+z*c; return [cx+s*(x*c+z*t),cy+s*(-y*p+depth*q),y*q+depth*p]; }
      function line(a,b,color,width=1,dash=[]) {
        ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.setLineDash([]);
      }
      function label(v,str,align='center') {ctx.fillStyle='#a0c0e8';ctx.font='10px monospace';ctx.textAlign=align;ctx.fillText(str,v[0],v[1]);}
      const floor=project([0,-1.13,0]);
      ctx.save();ctx.translate(cx,floor[1]);ctx.scale(1,.29);ctx.strokeStyle='#769bc744';ctx.setLineDash([3,5]);
      ctx.beginPath();ctx.arc(0,0,Math.min(w*.36,s*2.02),0,2*Math.PI);ctx.stroke();ctx.restore();
      const axisStart=[0,-1.14,0];
      for (const [pos,name] of [[[2.0,-1.14,0],'X'],[[-.04,2.0,0],'Z'],[[0,-1.14,2.02],'Y']]) {
        const a=project(axisStart),b=project(pos);
        line(a,b,'#8cb9f18c',.85,[4,5]);label([b[0]+6,b[1]-5],name);
      }
      const verts=model.points.map(project);
      const faces=model.faces.map((ids,i)=>({ids,i,z:ids.reduce((v,j)=>v+verts[j][2],0)/ids.length})).sort((a,b)=>a.z-b.z);
      const isCube=model===cube;
      if (inspector) hits = [];
      for (const face of faces) {
        if (selected && model.parts[face.i] !== selected) continue;
        const v=face.ids.map(i=>verts[i]);
        if(!v.length) continue;
        if (inspector) hits.push({vertices:v, part:model.parts[face.i]});
        const lit=Math.max(0,Math.min(1,(face.z+1)/2));
        let color;
        if(isCube) {
          const levels = Math.min(1,Math.max(0,(cy-v.reduce((a,b)=>a+b[1],0)/v.length)/s));
          color='rgba('+Math.round(36+43*levels)+','+Math.round(75+47*levels)+','+Math.round(128+55*levels)+',.82)';
        } else color='rgb('+Math.round(31+60*lit)+','+Math.round(65+73*lit)+','+Math.round(105+95*lit)+')';
        ctx.beginPath();ctx.moveTo(v[0][0],v[0][1]);for(const a of v.slice(1))ctx.lineTo(a[0],a[1]);ctx.closePath();
        ctx.fillStyle=selected?'#497eae':color;ctx.fill();ctx.lineWidth=isCube?1.6:.8;ctx.strokeStyle='#c5defb';ctx.stroke();
        if(isCube) {
          const mix=(a,b,t)=>[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];
          for(let j=1;j<8;j++){
            const k=j/8,ink=j===4?'#c6e1ff4d':'#bad7ff30';
            line(mix(v[0],v[1],k),mix(v[3],v[2],k),ink,.7);line(mix(v[0],v[3],k),mix(v[1],v[2],k),ink,.7);
          }
        }
      }
      if(isCube && !selected) {
        // Reference geometry stays aligned to the model as the camera orbits.
        const a=project([-1,1.19,-1]), b=project([1,1.19,-1]);
        line(a,b,'#b9d8ff80',.85); for(const v of [a,b])line([v[0]-2.5,v[1]-3],[v[0]+2.5,v[1]+3],'#b9d8ff');
        const front=faces.slice(-3);const seen=new Set(front.flatMap(f=>f.ids));
        for(const i of seen){const v=verts[i];ctx.fillStyle='#e0eeff';ctx.fillRect(v[0]-1.7,v[1]-1.7,3.4,3.4);}
      }
      for (const [x,y] of [[w*.13,h*.23],[w*.85,h*.28],[w*.17,h*.7],[w*.86,h*.72]]) {
        line([x-3,y],[x+3,y],'#819fc363',.8);line([x,y-3],[x,y+3],'#819fc363',.8);
      }
    }
    function focusPart(name) {
      if (!name) { reset(); return; }
      const indices = new Set();
      model.faces.forEach((face,i) => { if (model.parts[i] === name) face.forEach(index => indices.add(index)); });
      if (!indices.size) return;
      const low = [Infinity,Infinity,Infinity], high = [-Infinity,-Infinity,-Infinity];
      for (const index of indices) model.points[index].forEach((n,i) => {
        low[i] = Math.min(low[i], n); high[i] = Math.max(high[i], n);
      });
      const center = low.map((n,i) => (n+high[i])/2);
      const size = Math.max(...high.map((n,i) => n-low[i]), .01);
      const targetZoom = Math.min(70, 2.9 / size);
      let targetYaw = yaw, targetPitch = pitch;
      if (model === cube) {
        targetYaw = Math.atan2(-center[0],center[2]);
        if (center[1]) targetYaw = yaw;
        targetYaw = yaw + Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw));
        targetPitch = Math.asin(center[1]);
      }
      selected = name; selector.value = name; setSpin(false);
      flight = {start:performance.now(),from:pivot.slice(),to:center,z0:zoom,z1:targetZoom,
        y0:yaw,y1:targetYaw,p0:pitch,p1:targetPitch};
      if (reduce.matches) { flight=null; pivot=center; zoom=targetZoom; yaw=targetYaw; pitch=targetPitch; }
      draw();
    }
    function pick(x,y) {
      // Painter order is back-to-front; the last polygon under the pointer is visible.
      for (let i=hits.length-1;i>=0;i--) {
        const polygon=hits[i].vertices;
        let inside=false;
        for (let a=0,b=polygon.length-1;a<polygon.length;b=a++) {
          const [ax,ay]=polygon[a], [bx,by]=polygon[b];
          if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
        }
        if (inside) { focusPart(hits[i].part); break; }
      }
    }
    function scale(factor) {zoom=Math.max(.55,Math.min(inspector?70:1.75,zoom*factor));draw();}
    canvas.addEventListener('pointerdown',e=>{
      if (drag || e.button !== 0) return;
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};
      canvas.setPointerCapture(e.pointerId);
      previous=0;
    });
    canvas.addEventListener('pointermove',e=>{
      if (!drag || drag.id!==e.pointerId) return;
      if (!drag.moved && Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5) return;
      drag.moved=true;flight=null;
      yaw+=(e.clientX-drag.x)*.011;pitch=Math.max(-1.57,Math.min(1.57,pitch+(e.clientY-drag.y)*.011));
      drag.x=e.clientX;drag.y=e.clientY;draw();
    });
    canvas.addEventListener('pointerup',e=>{
      if (!drag || drag.id!==e.pointerId) return;
      if (inspector && !drag.moved) {
        const bounds=canvas.getBoundingClientRect();pick(e.clientX-bounds.left,e.clientY-bounds.top);
      }
      drag=null;previous=0;draw();
    });
    canvas.addEventListener('lostpointercapture',()=>{drag=null;previous=0;draw();});
    canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();
      if(e.key==='Home')return reset();
      if(['+','=','-'].includes(e.key))return scale(e.key==='-'?.9:1.1);
      yaw+=(Number(e.key==='ArrowRight')-Number(e.key==='ArrowLeft'))*.16;pitch+=(Number(e.key==='ArrowDown')-Number(e.key==='ArrowUp'))*.16;draw();
    });
    function loadParts() {
      if (!inspector) return;
      selector.replaceChildren(new Option('Modelo completo',''));
      for (const name of new Set(model.parts)) selector.add(new Option(name,name));
      reset();
    }
    if (inspector) {
      selector.onchange=()=>focusPart(selector.value);
      spinButton.onclick=()=>setSpin(!spinning);
      document.querySelector('#cad-home').onclick=()=>{reset();setSpin(!reduce.matches);};
      reduce.addEventListener('change',()=>setSpin(!reduce.matches));
      document.addEventListener('visibilitychange',()=>{previous=0;draw();});
      loadParts();
    }
    new ResizeObserver(draw).observe(canvas);reset();return {draw,reset,scale,loadParts,start(){reset();setSpin(!reduce.matches);}};
  }
  displays.push(setup(document.querySelector('#hero-cube')));
  const large=setup(document.querySelector('#large-cube'));displays.push(large);
  document.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>large.scale(Number(b.dataset.zoom)>0?1.17:1/1.17));
  document.querySelector('[data-reset]').onclick=large.reset;
  const dialog = document.querySelector('#cad-dialog');
  const workspace = document.querySelector('#cad-workspace');
  const inspector = setup(document.querySelector('#inspect-canvas'), true);
  displays.push(inspector);
  let enteredFullscreen = false;
  function closeInspector() {
    if (document.fullscreenElement === workspace) document.exitFullscreen().catch(()=>{});
    if (dialog.open) dialog.close();
  }
  document.querySelectorAll('[data-inspect]').forEach(button => button.onclick = () => {
    dialog.showModal();
    inspector.start();
    document.querySelector('#inspect-canvas').focus();
    // Embedded browsers can still use the viewport-sized workspace.
    if (workspace.requestFullscreen) workspace.requestFullscreen().catch(()=>{});
  });
  document.querySelector('#cad-close').onclick = closeInspector;
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeInspector();});
  document.addEventListener('fullscreenchange',()=>{
    if (document.fullscreenElement === workspace) enteredFullscreen=true;
    else if (enteredFullscreen) {enteredFullscreen=false;if(dialog.open) dialog.close();}
  });
  if(ARQUIVO_CAD)fetch(ARQUIVO_CAD).then(r=>{if(!r.ok)throw Error(r.status);return r.text();}).then(source=>{
    model=parseObj(source);document.querySelector('.cad-foot strong').textContent=window.STARK_UI.t('Robô da STARK');
    document.querySelector('#robot-dialog .dialog-foot span').textContent=window.STARK_UI.t('Arraste para girar · Robô da STARK');inspector.loadParts();displays.forEach(d=>d.draw());
  }).catch(error=>console.warn('Não foi possível carregar o CAD.',error));
})();
