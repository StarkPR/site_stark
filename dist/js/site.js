(() => {
  const $ = selector => document.querySelector(selector);
  const {t, inEnglish, animateHeading, observeHeadings} = window.STARK_UI;
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
      carousel.schedule();
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
    const player = $('#gallery-play');
    let selected = items;
    let slides = [];
    let active = 0;
    const carousel = window.STARK_CAROUSEL(frame, {
      interval:6500,
      canRotate:() => !dialog.open && !slides[active]?.querySelector('video'),
      onChange(index) {
        active = index;
        slides.forEach((slide, i) => {
          const video = slide.querySelector('video');
          if (!video) return;
          video.controls = i === index;
          if (i !== index) video.pause();
        });
        $('#gallery-count').textContent = number(index + 1) + ' / ' + number(selected.length);
        $('#media-caption').textContent = t(selected[index].legenda);
      }
    });
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let playing = !motion.matches;

    function setPlaying(value) {
      playing = value;
      const label = t(playing ? 'Pausar rotação' : 'Iniciar rotação');
      player.toggleAttribute('data-playing', playing);
      player.setAttribute('aria-label', label);
      player.title = label;
      $('#gallery-count').setAttribute('aria-live', playing ? 'off' : 'polite');
      carousel.setPlaying(playing);
    }

    function makeSlide(item) {
      const card = el('div', null, 'circular-card');
      let media;
      if (item.tipo === 'video' && item.arquivo) {
        const video = el('video');
        video.src = item.arquivo;
        video.playsInline = true;
        video.preload = 'metadata';
        video.setAttribute('aria-label', t(item.legenda));
        media = video;
      } else if (item.arquivo) {
        const button = el('button', null, 'gallery-zoom');
        button.type = 'button';
        button.setAttribute('aria-label', t('Ver foto em tela cheia') + ' · ' + t(item.legenda));
        const expand = el('span', '⛶', 'gallery-zoom-icon');
        expand.setAttribute('aria-hidden', 'true');
        button.append(photo(item.arquivo, item.legenda), expand);
        button.onclick = () => expandPhoto(item);
        media = button;
      } else {
        const slot = el('span', null, 'placeholder');
        const video = item.tipo === 'video';
        slot.append(icon(video ? 'film' : 'photo'), el('span', video ? 'Espaço para vídeo' : 'Espaço para foto'));
        media = slot;
      }
      media.classList.add('media-slide');
      card.append(media);
      return card;
    }

    function updateFilter(type) {
      slides.forEach(slide => slide.querySelector('video')?.pause());
      selected = type === 'tudo' ? items : items.filter(item => item.tipo === type);
      slides = selected.map(makeSlide);
      carousel.replace(slides);
      const hasNavigation = selected.length > 1;
      frame.toggleAttribute('data-single', !hasNavigation);
      arrows.forEach(arrow => { arrow.disabled = !hasNavigation; });
      player.hidden = !hasNavigation || motion.matches;
    }

    filters.forEach(button => {
      const type = button.dataset.filter;
      button.disabled = !items.some(item => type === 'tudo' || item.tipo === type);
      button.onclick = () => {
        filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
        updateFilter(type);
      };
    });
    arrows.forEach(button => { button.onclick = () => carousel.step(Number(button.dataset.gallery)); });
    player.onclick = () => setPlaying(!playing);
    motion.addEventListener('change', () => {
      player.hidden = selected.length < 2 || motion.matches;
      setPlaying(!motion.matches);
    });
    dialog.addEventListener('close', carousel.schedule);
    updateFilter('tudo');
    setPlaying(playing);
  }

  function renderMembers(items) {
    if (!items.length) return;
    const player = $('#member-play');
    const counter = $('#member-count');
    const stage = $('#member');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let playing = !motion.matches;
    const carousel = window.STARK_CAROUSEL(stage, {
      interval:3900,
      onChange(index) { counter.textContent = number(index + 1) + ' / ' + number(items.length); }
    });

    const cards = items.map(person => {
      const card = el('article', null, 'member-card circular-card');
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
    carousel.replace(cards);

    function setPlaying(value) {
      playing = value;
      player.textContent = t(playing ? 'Pausar rotação' : 'Iniciar rotação');
      player.hidden = motion.matches || items.length < 2;
      counter.setAttribute('aria-live', playing ? 'off' : 'polite');
      carousel.setPlaying(playing);
    }
    player.onclick = () => setPlaying(!playing);
    motion.addEventListener('change', () => setPlaying(!motion.matches));
    document.querySelectorAll('[data-member]').forEach(button => {
      button.disabled = items.length < 2;
      button.onclick = () => carousel.step(Number(button.dataset.member));
    });
    setPlaying(playing);
  }

  // Treat catalog copy as text, with ** marking the only supported formatting.
  function arenaParagraph(text) {
    const paragraph = el('p');
    t(text).split('**').forEach((part, index) => {
      paragraph.append(index % 2 ? el('strong', part) : document.createTextNode(part));
    });
    return paragraph;
  }

  function renderArena(data) {
    const event = data.competicoes[0];
    if (event) {
      $('#comp-copy').append(el('h3',event.nome), arenaParagraph(event.texto));
      if (event.imagem) $('#comp-image').append(photo(event.imagem,event.nome));
    }
    const list = $('#award-list');
    if (!data.premios.length) list.append(el('p','As premiações da STARK serão publicadas aqui.'));
    for (const prize of data.premios) {
      const record = el('article');
      if (prize.titulo) record.append(el('h4', prize.titulo));
      if (prize.edicao) record.append(el('p', prize.edicao));
      if (prize.texto) record.append(arenaParagraph(prize.texto));
      if (prize.imagem) record.append(photo(prize.imagem, prize.alt || ''));
      list.append(record);
    }
    const seasons = [...(data.temporadas || [])].sort((a, b) => b.ano - a.ano);
    for (const season of seasons) {
      const record = el('article');
      const story = el('div', null, 'season-story');
      story.append(el('h3', season.titulo || String(season.ano)));
      for (const paragraph of season.texto.split(/\n\s*\n/)) {
        story.append(arenaParagraph(paragraph));
      }
      record.append(story);
      if (season.robo?.length) {
        record.classList.add('season-with-retrospective');
        const comparison = el('div', null, 'season-robots');
        const banner = el('div', null, 'season-robot-banner');
        const title = el('h4');
        const label = el('span', 'Retrospectiva do J.A.R.V.I.S.');
        title.append(label);
        animateHeading(title, [label]);
        const miniature = el('span', null, 'season-robot-mini');
        miniature.setAttribute('aria-hidden', 'true');
        miniature.append(el('span', null, 'season-mini-sensor'));
        banner.append(title, miniature);
        comparison.append(banner);
        season.robo.forEach((version, index) => {
          if (index) {
            const arrow = el('span', '↓', 'season-robot-arrow');
            arrow.setAttribute('aria-hidden', 'true');
            comparison.append(arrow);
          }
          const figure = el('figure');
          figure.append(photo(version.imagem, version.alt), el('figcaption', version.legenda));
          comparison.append(figure);
        });
        record.append(comparison);
      }
      $('#season-list').append(record);
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
        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs.at(-1) :
          tabs[(i + direction + tabs.length) % tabs.length];
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
    observeHeadings();
  }
  fetch($('meta[name=stark-content]').content).then(r=>{if(!r.ok)throw Error('Falha ao carregar os dados');return r.json();})
    .then(render).catch(()=>{const note=el('p','Não foi possível carregar o conteúdo da equipe. Recarregue a página.');$('#media-frame').append(note);});
})();
