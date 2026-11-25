(() => {
  const $ = selector => document.querySelector(selector);
  const {t, inEnglish} = window.STARK_UI;
  function el(tag, text, className) {
    const item = document.createElement(tag);
    if(text) item.textContent = t(text);
    if(className) item.className = className;
    return item;
  }
  function icon(name) {
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg'),use=document.createElementNS(ns,'use');
    use.setAttribute('href','#'+name);svg.append(use);svg.setAttribute('aria-hidden','true');
    return svg;
  }
  const nav=$('#menu'),toggle=$('#menu-toggle');
  function setMenu(open){toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);}
  toggle.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
  nav.addEventListener('click',()=>setMenu(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){setMenu(false);toggle.focus();}});
  const links=[...nav.querySelectorAll('a')];
  function highlight(){
    const visible=links.filter(a=>$(a.hash).getBoundingClientRect().top<=innerHeight*.34);
    let active=visible.at(-1)||links[0];
    // Members and sponsors share a row on wide screens; honor an explicit anchor.
    if(visible.includes(links[4]) && visible.includes(links[5]) && active===links[5] &&
        Math.abs($(links[4].hash).offsetTop-$(links[5].hash).offsetTop)<90 && location.hash!==links[5].hash) active=links[4];
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-3)active=links.at(-1);
    links.forEach(a=>a===active?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'));
  }
  let scrolling=false;
  window.addEventListener('scroll',()=>{if(!scrolling){scrolling=true;requestAnimationFrame(()=>{highlight();scrolling=false;});}},{passive:true});
  window.addEventListener('resize',highlight);window.addEventListener('hashchange',highlight);highlight();
  document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{
    const d=document.getElementById(b.dataset.open);d.showModal();
    if(d.id==='robot-dialog')$('#large-cube').focus();
  }));
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
  function number(n){return String(n).padStart(2,'0');}
  function photo(src,alt){const img=el('img');img.src=src;img.alt=t(alt);img.loading='lazy';return img;}
  // Reveal each section once. The content stays visible when animation is unavailable.
  if ('IntersectionObserver' in window && typeof Element.prototype.animate === 'function') {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal.unobserve(entry.target);
        if (!motion.matches) entry.target.animate([
          {opacity:.18, transform:'translateY(20px)'}, {opacity:1, transform:'translateY(0)'}
        ], {duration:520, easing:'cubic-bezier(.2,.7,.2,1)'});
      }
    }, {threshold:.06});
    document.querySelectorAll('.about-grid article,.section .panel,.competitions .wrap,.contact-inner').forEach(node => reveal.observe(node));
  }
  function renderGallery(items) {
    const frame = $('#media-frame');
    const filters = [...document.querySelectorAll('[data-filter]')];
    const arrows = [...document.querySelectorAll('[data-gallery]')];
    const dialog = $('#gallery-photo-dialog');
    const surface = $('.gallery-photo-surface');
    const fullPhoto = $('#gallery-full-photo');
    const fullCaption = $('#gallery-photo-caption');
    let enteredFullscreen = false;
    async function expandPhoto(item) {
      fullPhoto.src = item.arquivo;
      fullCaption.textContent = t(item.legenda);
      dialog.showModal();
      try {
        await surface.requestFullscreen?.();
      } catch { /* The viewport-sized dialog also works without native fullscreen. */ }
    }
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement === surface) enteredFullscreen = true;
      else if (enteredFullscreen && dialog.open) dialog.close();
    });
    dialog.addEventListener('close', () => {
      enteredFullscreen = false;
      if (document.fullscreenElement === surface) document.exitFullscreen().catch(() => {});
      fullPhoto.removeAttribute('src');
    });
    let selected = items;
    let index = 0;
    let transition = [];
    function show(direction = 0) {
      for (const animation of transition) animation.cancel();
      transition = [];
      const previous = frame.lastElementChild;
      const item = selected[index];
      frame.querySelector('video')?.pause();
      frame.replaceChildren();
      let next;
      $('#gallery-count').textContent = number(index + 1) + ' / ' + number(selected.length);
      $('#media-caption').textContent = t(item.legenda);
      if (item.tipo === 'video' && item.arquivo) {
        const video = el('video');
        video.src = item.arquivo;
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.setAttribute('aria-label', t(item.legenda));
        next = video;
      } else if (item.arquivo) {
        next = el('button', null, 'gallery-zoom');
        next.type = 'button';
        next.setAttribute('aria-label', t('Ver foto em tela cheia') + ' · ' + t(item.legenda));
        const expand = el('span', '⛶', 'gallery-zoom-icon');
        expand.setAttribute('aria-hidden', 'true');
        next.append(photo(item.arquivo, item.legenda), expand);
        next.onclick = () => expandPhoto(item);
      } else {
        const slot = el('span', null, 'placeholder');
        const video = item.tipo === 'video';
        slot.append(icon(video ? 'film' : 'photo'), el('span', video ? 'Espaço para vídeo' : 'Espaço para foto'));
        next = slot;
      }
      next.classList.add('media-slide');
      if (previous && direction && typeof next.animate === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        previous.inert = true;
        previous.setAttribute('aria-hidden','true');
        frame.append(previous, next);
        const timing = {duration:390, easing:'cubic-bezier(.22,.72,.22,1)'};
        const slide = (node,from,to) => node.animate([
          {transform:'translateX('+from+'%)'}, {transform:'translateX('+to+'%)'}
        ],timing);
        transition = [slide(previous,0,-direction*100),slide(next,direction*100,0)];
        transition[0].onfinish = () => previous.remove();
      } else {
        frame.append(next);
      }
    }
    for (const button of filters) {
      const type = button.dataset.filter;
      button.disabled = !items.some(item => type === 'tudo' || item.tipo === type);
      button.onclick = () => {
        selected = type === 'tudo' ? items : items.filter(item => item.tipo === type);
        index = 0;
        arrows.forEach(arrow => { arrow.disabled = selected.length < 2; });
        filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
        show();
      };
    }
    arrows.forEach(button => {
      button.disabled = selected.length < 2;
      button.onclick = () => {
        const direction = Number(button.dataset.gallery);
        index = (index + direction + selected.length) % selected.length;
        show(direction);
      };
    });
    if (selected.length) show();
  }

  function renderMembers(items) {
    if (!items.length) return;
    const panel = $('.member-panel');
    const player = $('#member-play');
    const counter = $('#member-count');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const stage = $('#member');
    const travelTime = 6500; // Milliseconds for one profile to cross the center.
    const copies = items.length === 1 ? 1 : Math.ceil(4 / items.length);
    const profiles = Array.from({length: copies}, () => items).flat();
    const wrap = (value, length) => ((value % length) + length) % length;
    let position = 0;
    let target = null;
    let playing = !motion.matches;
    let visible = false;
    let frame = null;
    let lastTime = null;
    let current = -1;

    const cards = profiles.map(person => {
      const card = el('article', null, 'member-card');
      const portrait = el('a', null, 'member-photo');
      portrait.href = person.instagram;
      portrait.target = '_blank';
      portrait.rel = 'noopener';
      portrait.setAttribute('aria-label', inEnglish ? 'Open ' + person.nome + '’s Instagram in a new tab' : 'Abrir Instagram de ' + person.nome + ' em nova aba');
      const initials = person.nome.split(/\s+/).map(part => part[0]).slice(0, 2).join('');
      portrait.append(person.foto ? photo(person.foto, '') : el('span', initials, 'monogram'));
      portrait.append(el('span', 'Instagram ↗', 'profile-tag'));
      card.append(portrait, el('h3', person.nome), el('small', person.funcao));
      return card;
    });
    stage.replaceChildren(...cards);

    function paint() {
      const half = cards.length / 2;
      cards.forEach((card, i) => {
        const offset = wrap(i - position + half, cards.length) - half;
        const distance = Math.abs(offset);
        const scale = 1 - .16 * Math.min(distance, 1.6);
        const fade = Math.max(0, Math.min(1, (1.94 - distance) / .5));
        card.style.transform = 'translate3d(' + offset * 95 + '%,0,0) scale(' + scale + ')';
        card.style.opacity = (1 - .19 * Math.min(distance, 1)) * fade;
        card.style.zIndex = String(Math.round(100 - 20 * distance));
        const hidden = distance > 1.65;
        if (card.inert !== hidden) {
          card.inert = hidden;
          card.setAttribute('aria-hidden', String(hidden));
        }
      });
      const nearest = wrap(Math.round(position), items.length);
      if (nearest !== current) {
        current = nearest;
        counter.textContent = number(current + 1) + ' / ' + number(items.length);
      }
    }

    function canMove() {
      return cards.length > 1 && visible && !document.hidden &&
        (target !== null || (playing && !stage.contains(document.activeElement)));
    }
    function tick(time) {
      frame = null;
      if (!canMove()) { lastTime = null; return; }
      const elapsed = lastTime === null ? 0 : Math.min(time - lastTime, 100);
      lastTime = time;
      if (target === null) {
        position = wrap(position + elapsed / travelTime, cards.length);
      } else {
        const gap = target - position;
        const step = elapsed / 420;
        if (Math.abs(gap) <= step) {
          position = wrap(target, cards.length);
          target = null;
        } else {
          position += Math.sign(gap) * step;
        }
      }
      paint();
      if (canMove()) frame = requestAnimationFrame(tick);
      else lastTime = null;
    }
    function sync() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      if (canMove()) frame = requestAnimationFrame(tick);
    }
    function advance(direction) {
      if (items.length < 2) return;
      target = (target ?? Math.round(position)) + direction;
      if (motion.matches) {
        position = wrap(target, cards.length);
        target = null;
        paint();
      }
      sync();
    }
    function setPlaying(value) {
      playing = value;
      target = null;
      player.textContent = t(playing ? 'Pausar rotação' : 'Iniciar rotação');
      counter.setAttribute('aria-live', playing ? 'off' : 'polite');
      sync();
    }
    player.onclick = () => setPlaying(!playing);
    motion.addEventListener('change', () => setPlaying(!motion.matches));
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(stage);
    stage.addEventListener('focusin', sync);
    stage.addEventListener('focusout', () => requestAnimationFrame(sync));
    document.addEventListener('visibilitychange', sync);
    document.querySelectorAll('[data-member]').forEach(b => b.onclick = () => advance(Number(b.dataset.member)));
    paint();
    setPlaying(playing);
  }

  function renderArena(data) {
    const event = data.competicoes[0];
    if (event) {
      $('#comp-copy').append(el('h3',event.nome), el('p',event.texto));
      if (event.imagem) $('#comp-image').append(photo(event.imagem,event.nome));
    }
    const list = $('#award-list');
    if (!data.premios.length) list.append(el('p','As premiações da STARK serão publicadas aqui.'));
    for (const prize of data.premios) {
      const record = el('article');
      record.append(el('h4',prize.titulo), el('p',prize.edicao));
      list.append(record);
    }
    const tabs = [...document.querySelectorAll('.arena-tabs [role=tab]')];
    function select(tab) {
      for (const current of tabs) {
        const active = current === tab;
        current.setAttribute('aria-selected', String(active));
        current.tabIndex = active ? 0 : -1;
        document.getElementById(current.getAttribute('aria-controls')).hidden = !active;
      }
    }
    tabs.forEach((tab, i) => {
      tab.onclick = () => select(tab);
      tab.onkeydown = e => {
        if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
        e.preventDefault();
        const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs.at(-1) : tabs[1-i];
        next.focus();
        select(next);
      };
    });
  }

  function render(data) {
    document.querySelectorAll('[data-field]').forEach(p => p.textContent = t(data.sobre[p.dataset.field] || 'inserir texto'));
    if (data.sobre.fundacao) $('[data-field=quem]').append(el('small', (inEnglish ? ' · Founded in ' : ' · Fundação em ') + data.sobre.fundacao));
    renderGallery(data.galeria);
    renderMembers(data.integrantes);
    renderArena(data);
    document.querySelectorAll('[data-spec]').forEach(row => row.textContent = t(data.robo[row.dataset.spec] || ''));
    for (const entry of data.diario) $('#diary-body').append(el('h3',entry.titulo), el('p',entry.texto));
    for (const supporter of data.apoiadores) {
      const tile = el('figure', null, 'supporter-tile');
      tile.append(photo(supporter.imagem,supporter.nome));
      $('#supporters').append(tile);
    }
  }
  fetch($('meta[name=stark-content]').content).then(r=>{if(!r.ok)throw Error('Falha ao carregar os dados');return r.json();})
    .then(render).catch(()=>{const note=el('p','Não foi possível carregar o conteúdo da equipe. Recarregue a página.');$('#media-frame').append(note);});
})();
