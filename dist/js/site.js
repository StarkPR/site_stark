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
    if (!items.length) return;
    const duration = 5200;
    const frame = $('#media-frame');
    const stage = $('#gallery-slides');
    const progress = $('#gallery-progress');
    const player = $('#gallery-play');
    const counter = $('#gallery-count');
    const caption = $('#media-caption');
    const filters = [...document.querySelectorAll('[data-filter]')];
    const navigation = $('.gallery-navigation');
    const dialog = $('#gallery-photo-dialog');
    const surface = $('.gallery-photo-surface');
    const fullPhoto = $('#gallery-full-photo');
    const fullCaption = $('#gallery-photo-caption');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let selected = items;
    let slides = [];
    let bars = [];
    let photoIndexes = [];
    let active = -1;
    let elapsed = 0;
    let startedAt;
    let animation = 0;
    let playing = !motion.matches;
    let visible = !('IntersectionObserver' in window);
    let hovered = false;
    let drag;
    let suppressClick = false;
    let enteredFullscreen = false;

    async function expandPhoto(item) {
      fullPhoto.src = item.arquivo;
      fullCaption.textContent = t(item.legenda);
      dialog.showModal();
      updateClock();
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
      updateClock();
    });

    function fillBar(ratio) {
      bars[active]?.style.setProperty('--story-fill', Math.min(1, ratio));
    }

    function stopClock() {
      cancelAnimationFrame(animation);
      animation = 0;
      startedAt = undefined;
    }

    function nextPhoto() {
      return photoIndexes.find(index => index > active) ?? photoIndexes[0];
    }

    function tick(now) {
      startedAt ??= now - elapsed;
      elapsed = now - startedAt;
      fillBar(elapsed / duration);
      if (elapsed >= duration) {
        select(nextPhoto(), 1);
      } else {
        animation = requestAnimationFrame(tick);
      }
    }

    function updateClock() {
      const canAdvance = playing && !motion.matches && visible && !document.hidden &&
        !hovered && !drag && !dialog.open && !frame.matches(':focus-visible, :has(:focus-visible)') &&
        selected[active]?.tipo === 'foto' && photoIndexes.length > 1;
      if (canAdvance) {
        if (!animation) {
          slides[nextPhoto()].querySelector('img')?.setAttribute('loading', 'eager');
          animation = requestAnimationFrame(tick);
        }
      } else {
        stopClock();
      }
    }

    function setPlaying(value) {
      playing = value;
      const label = t(playing ? 'Pausar rotação' : 'Iniciar rotação');
      player.toggleAttribute('data-playing', playing);
      player.setAttribute('aria-label', label);
      player.title = label;
      counter.setAttribute('aria-live', playing ? 'off' : 'polite');
      updateClock();
    }

    function makeSlide(item, index) {
      const card = el('div', null, 'gallery-slide');
      card.inert = true;
      card.setAttribute('aria-hidden', 'true');
      let media;
      if (item.tipo === 'video' && item.arquivo) {
        const video = el('video');
        card.classList.add('gallery-video-card');
        video.src = item.arquivo;
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.setAttribute('aria-label', t(item.legenda));
        for (const event of ['timeupdate', 'loadedmetadata']) {
          video.addEventListener(event, () => {
            if (index === active && slides[active] === card && video.duration > 0) {
              fillBar(video.currentTime / video.duration);
            }
          });
        }
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

    stage.addEventListener('animationend', event => {
      if (event.animationName === 'story-slide-exit') event.target.removeAttribute('data-leaving');
    });

    function select(index, direction, animate = true) {
      if (index === active) return;
      stopClock();
      elapsed = 0;
      slides.forEach(slide => slide.removeAttribute('data-leaving'));
      const previous = slides[active];
      if (previous) {
        if (previous.contains(document.activeElement)) frame.focus({preventScroll:true});
        previous.querySelector('video')?.pause();
        previous.removeAttribute('data-centered');
        previous.inert = true;
        previous.setAttribute('aria-hidden', 'true');
      }
      const shouldAnimate = animate && !motion.matches;
      if (previous && shouldAnimate) previous.setAttribute('data-leaving', '');
      stage.style.setProperty('--story-direction', direction);
      stage.toggleAttribute('data-animate', shouldAnimate);
      active = index;
      slides[active].setAttribute('data-centered', '');
      slides[active].inert = false;
      slides[active].removeAttribute('aria-hidden');
      const video = slides[active].querySelector('video');
      frame.toggleAttribute('data-video', Boolean(video));
      counter.textContent = number(index + 1) + ' / ' + number(selected.length);
      caption.textContent = t(selected[index].legenda);
      bars.forEach((bar, i) => {
        bar.style.setProperty('--story-fill', i < index ? 1 : 0);
        if (i === index) bar.setAttribute('aria-current', 'true');
        else bar.removeAttribute('aria-current');
      });
      if (video?.duration > 0) fillBar(video.currentTime / video.duration);
      updateClock();
    }

    function updateFilter(type) {
      const wasVideo = selected[active]?.tipo === 'video';
      slides.forEach(slide => slide.querySelector('video')?.pause());
      active = -1;
      selected = type === 'tudo' ? items : items.filter(item => item.tipo === type);
      slides = selected.map(makeSlide);
      photoIndexes = [];
      bars = selected.map((item, index) => {
        if (item.tipo === 'foto') photoIndexes.push(index);
        const button = el('button');
        button.type = 'button';
        button.setAttribute('aria-label', t('Ir para mídia') + ' ' + (index + 1) + ' · ' + t(item.legenda));
        button.onclick = () => select(index, index >= active ? 1 : -1);
        return button;
      });
      progress.replaceChildren(...bars);
      stage.replaceChildren(...slides);
      frame.toggleAttribute('data-single', selected.length < 2);
      navigation.hidden = selected.length < 2;
      player.hidden = motion.matches || photoIndexes.length < 2;
      select(0, 1, !wasVideo && type === 'video');
    }

    function step(direction) {
      select((active + direction + selected.length) % selected.length, direction);
    }

    filters.forEach(button => {
      const type = button.dataset.filter;
      button.disabled = !items.some(item => type === 'tudo' || item.tipo === type);
      button.onclick = () => {
        filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
        updateFilter(type);
      };
    });
    navigation.querySelectorAll('[data-gallery]').forEach(button => {
      button.onclick = () => step(Number(button.dataset.gallery));
    });
    frame.addEventListener('keydown', event => {
      if (event.target.closest('video') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    });
    frame.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovered = true;
      updateClock();
    });
    frame.addEventListener('pointerdown', event => {
      suppressClick = false;
      if (event.button !== 0 || selected.length < 2 || event.target.closest('video, .gallery-navigation')) return;
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY};
      updateClock();
    });
    frame.addEventListener('pointerup', event => {
      if (drag?.id !== event.pointerId) return;
      const distance = event.clientX - drag.x;
      const vertical = event.clientY - drag.y;
      drag = undefined;
      if (Math.abs(distance) > Math.max(32, Math.abs(vertical))) {
        suppressClick = true;
        step(distance < 0 ? 1 : -1);
      }
      updateClock();
    });
    frame.addEventListener('pointercancel', () => {
      drag = undefined;
      updateClock();
    });
    frame.addEventListener('pointerleave', () => {
      drag = undefined;
      hovered = false;
      updateClock();
    });
    frame.addEventListener('click', event => {
      if (suppressClick && event.detail) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }
    }, true);
    frame.addEventListener('focusin', updateClock);
    frame.addEventListener('focusout', () => queueMicrotask(updateClock));
    document.addEventListener('visibilitychange', updateClock);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        updateClock();
      }, {threshold:.15});
      observer.observe(frame);
    }
    player.onclick = () => setPlaying(!playing);
    motion.addEventListener('change', () => {
      player.hidden = motion.matches || photoIndexes.length < 2;
      setPlaying(!motion.matches);
    });
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
