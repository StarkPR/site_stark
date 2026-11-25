// Visualizador do uniforme. A malha e a textura estão reunidas em um GLB local.
(() => {
  'use strict';
  const root = document.getElementById('camisa3d');
  if (!root) return;
  const assets = new URL('../assets/uniforme/', document.currentScript.src);
  const css = document.createElement('style');
  css.textContent = `
    #camisa3d { position:relative; width:100%; color:#11274a; }
    #camisa3d .uniform-stage {position:relative;display:grid;place-items:center;width:100%;height:var(--uniforme-altura,360px);min-height:230px;overflow:hidden;outline-offset:-3px;cursor:grab;touch-action:none}
    #camisa3d .uniform-stage:active {cursor:grabbing}
    #camisa3d .uniform-stage::before {content:"";position:absolute;bottom:3%;left:28%;width:44%;height:5%;border-radius:50%;background:radial-gradient(ellipse,rgba(14,36,65,.18),transparent 67%);pointer-events:none}
    #camisa3d canvas,#camisa3d .uniform-poster {position:absolute;height:100%;width:100%;object-fit:contain;user-select:none;pointer-events:none}
    #camisa3d .uniform-controls {display:flex;justify-content:center;align-items:center;gap:.3rem;margin:.25rem auto 0}
    #camisa3d .uniform-controls button {font:600 12px/1.1 system-ui,sans-serif;letter-spacing:.02em;border:1px solid #a7bbcb;border-radius:999px;color:#11274a;background:#f5f9fc;min-width:44px;min-height:38px;padding:7px 13px;cursor:pointer}
    #camisa3d .uniform-controls button:hover,#camisa3d .uniform-controls button:focus-visible {background:#d9e7f2}
    #camisa3d .uniform-stage:focus-visible,#camisa3d .uniform-controls button:focus-visible {outline:3px solid #397aa6}
    #camisa3d [hidden] {display:none}
  `;
  document.head.append(css);
  root.innerHTML = '<div class="uniform-stage" tabindex="0" role="group" aria-label="Camisa da Stark em 3D. Arraste ou use as setas do teclado para girar."><img class="uniform-poster" alt="Uniforme azul-marinho da Stark, com os escudos da equipe e do SESI." draggable="false"><canvas hidden aria-hidden="true"></canvas></div><div class="uniform-controls" aria-label="Vistas da camisa"></div>';
  const stage = root.querySelector('.uniform-stage');
  const poster = root.querySelector('img');
  const canvas = root.querySelector('canvas');
  const bar = root.querySelector('.uniform-controls');
  const turn = Math.PI * 2;
  let yaw = 0, pitch = 0, gpuRender, drawRequest = 0, lastFrame = -1;
  const normalize = angle => (angle % turn + turn) % turn;
  function change(horizontal, vertical = 0) {
    yaw = normalize(horizontal);
    pitch = Math.max(-0.95, Math.min(0.95, vertical));
    if (!drawRequest) drawRequest = requestAnimationFrame(render);
  }
  function render() {
    drawRequest = 0;
    if (gpuRender) {
      gpuRender(yaw, pitch);
      return;
    }
    const frame = Math.round(normalize(yaw) / turn * 16) % 16;
    if (frame !== lastFrame) {
      poster.src = new URL('vistas/' + frame + '.webp', assets);
      lastFrame = frame;
    }
  }
  function button(label, title, action) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', title);
    b.addEventListener('click', action); bar.append(b); return b;
  }
  button('↶', 'Girar a camisa para a esquerda', () => change(yaw - turn / 8, pitch));
  button('Frente', 'Ver a frente da camisa', () => change(0));
  button('Costas', 'Ver as costas da camisa', () => change(Math.PI));
  button('↷', 'Girar a camisa para a direita', () => change(yaw + turn / 8, pitch));
  stage.addEventListener('keydown', event => {
    const keys = {
      ArrowLeft: () => change(yaw - turn / 16, pitch), ArrowRight: () => change(yaw + turn / 16, pitch),
      ArrowUp: () => change(yaw, pitch + 0.14), ArrowDown: () => change(yaw, pitch - 0.14),
      Home: () => change(0), End: () => change(Math.PI)
    };
    if (keys[event.key]) { event.preventDefault(); keys[event.key](); }
  });
  const dialog = document.createElement('dialog');
  dialog.className = 'uniform-dialog';
  dialog.setAttribute('aria-label', 'Uniforme da Stark em tela cheia');
  const surface = document.createElement('div');
  surface.className = 'uniform-surface';
  dialog.append(surface);
  document.body.append(dialog);
  const home = root.parentElement;
  const placeholder = document.createComment('Visualizador do uniforme');
  home.insertBefore(placeholder,root);
  const pointers = new Map();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let zoom = 1, rotating = false, spinFrame = null, lastTime = null;
  let enteredFullscreen = false;

  function setZoom(value) {
    zoom = Math.min(3, Math.max(.65, value));
    poster.style.transform = 'scale(' + zoom + ')';
    change(yaw,pitch);
  }
  function syncSpin() {
    if (spinFrame !== null) cancelAnimationFrame(spinFrame);
    spinFrame = null;
    lastTime = null;
    spin.textContent = rotating ? 'Pausar giro' : 'Girar';
    spin.setAttribute('aria-label',spin.textContent);
    if (!dialog.open || !rotating || pointers.size || document.hidden) return;
    function step(now) {
      if (lastTime !== null) change(yaw + Math.min(now-lastTime,70)*.00032,pitch);
      lastTime = now;
      spinFrame = requestAnimationFrame(step);
    }
    spinFrame = requestAnimationFrame(step);
  }
  function close() {
    if (document.fullscreenElement === surface) document.exitFullscreen().catch(()=>{});
    if (dialog.open) dialog.close();
  }
  const expand = button('Tela cheia', 'Abrir uniforme em tela cheia', () => {
    surface.append(root);
    expand.hidden = true;
    extra.forEach(b=>b.hidden=false);
    dialog.showModal();
    stage.focus({preventScroll:true});
    setZoom(1);
    rotating = !motion.matches;
    syncSpin();
    if (surface.requestFullscreen) surface.requestFullscreen().catch(()=>{});
  });
  const minus = button('−','Diminuir zoom',()=>setZoom(zoom/1.2));
  const plus = button('+','Aumentar zoom',()=>setZoom(zoom*1.2));
  const spin = button('Pausar giro','Pausar giro',()=>{rotating=!rotating;syncSpin();});
  const exit = button('Fechar','Sair da tela cheia',close);
  const extra = [minus,plus,spin,exit];
  extra.forEach(b=>b.hidden=true);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('close',()=>{
    pointers.clear();
    rotating=false;syncSpin();
    placeholder.after(root);
    extra.forEach(b=>b.hidden=true);
    expand.hidden=false;setZoom(1);
    expand.focus({preventScroll:true});
  });
  document.addEventListener('fullscreenchange',()=>{
    if (document.fullscreenElement === surface) enteredFullscreen=true;
    else if (enteredFullscreen) {enteredFullscreen=false;if(dialog.open)close();}
  });
  document.addEventListener('visibilitychange',syncSpin);
  motion.addEventListener('change',()=>{if(motion.matches){rotating=false;syncSpin();}});
  function distance() {
    const [a,b] = pointers.values();
    return Math.hypot(a.x-b.x,a.y-b.y);
  }
  stage.addEventListener('pointerdown',e=>{
    if (e.button!==0 || pointers.size >= (dialog.open ? 2 : 1)) return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    stage.setPointerCapture(e.pointerId);
    syncSpin();
  });
  stage.addEventListener('pointermove',e=>{
    const old=pointers.get(e.pointerId);
    if (!old) return;
    const gap = pointers.size===2 ? distance() : 0;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if (pointers.size===2) { if (gap>1) setZoom(zoom*distance()/gap); }
    else change(yaw+(e.clientX-old.x)*.012,pitch-(e.clientY-old.y)*.009);
  });
  function release(e) { if (pointers.delete(e.pointerId)) syncSpin(); }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(type,release);
  stage.addEventListener('wheel',e=>{
    if(!dialog.open) return;
    e.preventDefault();
    setZoom(zoom*Math.exp(-Math.sign(e.deltaY)*.1));
  },{passive:false});
  function shader(gl,type,source) {
    const item = gl.createShader(type);
    gl.shaderSource(item,source); gl.compileShader(item);
    if (!gl.getShaderParameter(item,gl.COMPILE_STATUS)) throw Error('Shader do uniforme indisponível.');
    return item;
  }
  async function setup() {
    const gl = canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
    if (!gl) return;
    const response = await fetch(new URL('camisa-stark.glb',assets));
    if (!response.ok) throw Error('Modelo indisponível.');
    const bytes = await response.arrayBuffer(), header = new DataView(bytes);
    const jsonLength = header.getUint32(12,true), binOffset = 28 + jsonLength;
    const model = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonLength)));
    const prim = model.meshes[0].primitives[0];
    const program = gl.createProgram();
    gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,`
      attribute vec3 position; attribute vec2 uv; varying vec2 tex;
      uniform vec4 angles; uniform vec2 scale;
      void main() {
        float x = angles.x*position.x + angles.y*position.z;
        float z = -angles.y*position.x + angles.x*position.z;
        float y = angles.z*position.y - angles.w*z;
        float depth = angles.w*position.y + angles.z*z;
        gl_Position = vec4(x*scale.x, y*scale.y, -depth*.6, 1.);
        tex=uv;
      }`));
    gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,'precision mediump float; varying vec2 tex; uniform sampler2D cloth; void main(){gl_FragColor=texture2D(cloth,tex);}'));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Programa gráfico do uniforme indisponível.');
    gl.useProgram(program);
    function bind(accessorIndex, attr) {
      const accessor = model.accessors[accessorIndex], view = model.bufferViews[accessor.bufferView];
      const isIndex = !attr, target = isIndex ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
      gl.bindBuffer(target,gl.createBuffer());
      gl.bufferData(target,new Uint8Array(bytes,binOffset + (view.byteOffset || 0),view.byteLength),gl.STATIC_DRAW);
      if (!isIndex) {
        const loc = gl.getAttribLocation(program,attr);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc,accessor.type === 'VEC3' ? 3 : 2,gl.FLOAT,false,view.byteStride || 0,accessor.byteOffset || 0);
      }
    }
    bind(prim.attributes.POSITION,'position'); bind(prim.attributes.TEXCOORD_0,'uv'); bind(prim.indices);
    const imgView = model.bufferViews[model.images[0].bufferView];
    const textureData = new Blob([new Uint8Array(bytes,binOffset+imgView.byteOffset,imgView.byteLength)],{type:model.images[0].mimeType});
    const url = URL.createObjectURL(textureData);
    const image = new Image(); image.src = url;
    try { await image.decode(); } finally { URL.revokeObjectURL(url); }
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
    for (const par of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,par,gl.CLAMP_TO_EDGE);
    for (const par of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,par,gl.LINEAR);
    const angles = gl.getUniformLocation(program,'angles'), scale = gl.getUniformLocation(program,'scale');
    gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
    gpuRender = (y,p) => {
      const rect = stage.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1,2);
      const w = Math.max(1,Math.round(rect.width*ratio)), h = Math.max(1,Math.round(rect.height*ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const size = Math.min(.87, w/h*1.03) * zoom;
      gl.uniform2f(scale,size*h/w,size); gl.uniform4f(angles,Math.cos(y),Math.sin(y),Math.cos(p),Math.sin(p));
      gl.drawElements(gl.TRIANGLES,model.accessors[prim.indices].count,gl.UNSIGNED_SHORT,0);
    };
    render(); canvas.hidden = false; poster.hidden = true;
    new ResizeObserver(() => change(yaw,pitch)).observe(stage);
  }
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); gpuRender=null; canvas.hidden=true; poster.hidden=false; render();
  });
  canvas.addEventListener('webglcontextrestored', () => setup().catch(() => render()));
  render();
  setup().catch(() => render());
})();
