/* Do Bruto ao Pronto com IA · player da VSL (Mux · HLS).
   Autoplay mudo, um clique para ouvir, depois só pausar e continuar. Sem seek, sem velocidade, barra só de leitura.
   O hls.js (js/vendor) só é baixado nos navegadores que não tocam HLS sozinhos. */
(function () {
  'use strict';

  var raiz = document.getElementById('vsl');
  if (!raiz) return;

  var v = raiz.querySelector('.vsl-video');
  var ouvir = raiz.querySelector('.vsl-ouvir');
  var alvo = raiz.querySelector('.vsl-alvo');
  var barra = raiz.querySelector('.vsl-barra i');
  var erro = raiz.querySelector('.vsl-erro');
  var tentar = erro.querySelector('button');

  var id = raiz.getAttribute('data-mux-playback-id');
  var fonte = raiz.getAttribute('data-src');   // MP4 direto (upsell); sem ele, HLS do Mux
  var url = 'https://stream.mux.com/' + id + '.m3u8';
  var scriptHls = (document.currentScript && document.currentScript.src || '').replace(/[^\/]*$/, '') + 'vendor/hls.min.js';
  var reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HLS_MIME = 'application/vnd.apple.mpegurl';

  var hls = null;
  var iniciado = false;   // já houve o primeiro clique (áudio liberado)
  var ultimo = 0;         // última posição legítima, para desfazer qualquer salto
  var permitirSalto = false;
  var raf = 0;
  var vigia = 0;

  function estado(e) { raiz.setAttribute('data-estado', e); }

  /* ---------- Progresso (só visual) ---------- */
  function pintar() {
    var d = v.duration;
    var p = d > 0 && isFinite(d) ? Math.min(1, Math.max(0, v.currentTime / d)) : 0;
    barra.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (!v.seeking) ultimo = v.currentTime;
  }
  function laco() {
    pintar();
    raf = v.paused || v.ended ? 0 : requestAnimationFrame(laco);
  }
  function seguir() { if (!raf && !reduzido) raf = requestAnimationFrame(laco); }

  /* Único caminho legítimo para mudar a posição: reiniciar em 0:00. */
  function irPara(t) {
    permitirSalto = true;
    ultimo = t;
    try { v.currentTime = t; } catch (e) { /* sem metadados ainda: o play() começa do zero */ }
    setTimeout(function () { permitirSalto = false; }, 600);
  }

  /* ---------- Falha ---------- */
  function falhar() {
    clearTimeout(vigia);
    if (hls) { hls.destroy(); hls = null; }
    try { v.pause(); } catch (e) {}
    estado('erro');
    ouvir.hidden = true;
    alvo.hidden = true;
    erro.hidden = false;
    tentar.focus({ preventScroll: true });
  }

  /* ---------- Fonte HLS ---------- */
  function carregarHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = scriptHls;
      s.onload = function () { window.Hls ? ok(window.Hls) : no(); };
      s.onerror = no;
      document.head.appendChild(s);
    });
  }

  function usarHls(Hls) {
    var tentativas = 0, recuperou = false;
    hls = new Hls({ capLevelToPlayerSize: true, maxMaxBufferLength: 60 });
    hls.on(Hls.Events.FRAG_LOADED, function () { tentativas = 0; });
    hls.on(Hls.Events.ERROR, function (_, d) {
      if (!d.fatal) return;
      if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
        var cod = d.response && d.response.code;
        if (cod >= 400 && cod < 500) return falhar();       // ID inválido ou vídeo removido: repetir não adianta
        if (++tentativas > 3) return falhar();
        setTimeout(function () { hls && hls.startLoad(); }, 800 * tentativas);
      } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !recuperou) {
        recuperou = true;
        hls.recoverMediaError();
      } else {
        falhar();
      }
    });
    hls.loadSource(url);
    hls.attachMedia(v);
  }

  function carregar() {
    if (fonte) { v.src = fonte; return Promise.resolve(); }
    var nativo = v.canPlayType(HLS_MIME);
    var temMse = !!(window.MediaSource || window.ManagedMediaSource);
    if (nativo && !temMse) { v.src = url; return Promise.resolve(); }    // iPhone antigo e afins
    return carregarHls().then(function (Hls) {
      if (Hls.isSupported()) usarHls(Hls);
      else if (nativo) v.src = url;
      else throw new Error('sem suporte a HLS');
    }).catch(function () {
      if (nativo) { v.src = url; return; }
      throw new Error('falha ao carregar');
    });
  }

  /* ---------- Início ---------- */
  function autoplayMudo() {
    v.muted = !iniciado;
    var p = v.play();
    if (!p || !p.then) return;
    p.then(function () { if (!iniciado) estado('mudo'); }, function (e) {
      if (e && e.name === 'AbortError') return;     // trocou a fonte no meio do caminho
      if (!iniciado) estado('bloqueado');           // o navegador barrou o autoplay
      else { estado('pausado'); alvo.setAttribute('aria-label', 'Continuar vídeo'); }
    });
  }

  function partir() {
    estado('carregando');
    erro.hidden = true;
    ouvir.hidden = iniciado;
    alvo.hidden = !iniciado;
    clearTimeout(vigia);
    vigia = setTimeout(function () { if (v.readyState < 2) falhar(); }, 20000);
    carregar().then(function () {
      if (reduzido && !iniciado) estado('bloqueado');   // sem movimento automático para quem pediu menos movimento
      else autoplayMudo();
    }, falhar);
  }

  /* Primeiro clique: volta ao 0:00, liga o som, toca e tira a sobreposição. */
  function primeiroClique() {
    iniciado = true;
    raiz.setAttribute('data-iniciado', '');
    ouvir.hidden = true;
    alvo.hidden = false;
    irPara(0);
    v.muted = false;
    v.volume = 1;
    var p = v.play();
    if (p && p.catch) p.catch(function (e) {
      if (e && e.name === 'AbortError') return;
      v.muted = true;                                // som barrado: segue mudo em vez de travar
      v.play().catch(function () { iniciado = false; raiz.removeAttribute('data-iniciado'); ouvir.hidden = false; alvo.hidden = true; estado('bloqueado'); });
    });
    alvo.focus({ preventScroll: true });
  }

  /* ---------- Pausar e continuar ---------- */
  function alternar() {
    if (v.ended) irPara(0);
    if (v.paused || v.ended) v.play().catch(function () {});
    else v.pause();
  }

  ouvir.addEventListener('click', primeiroClique);
  alvo.addEventListener('click', alternar);
  tentar.addEventListener('click', function () {
    if (hls) { hls.destroy(); hls = null; }
    v.removeAttribute('src');
    v.load();
    partir();
  });

  v.addEventListener('playing', function () {
    clearTimeout(vigia);
    if (iniciado) { estado('tocando'); alvo.setAttribute('aria-label', 'Pausar vídeo'); }
    seguir();
  });
  v.addEventListener('pause', function () {
    pintar();
    if (iniciado && !v.ended && raiz.getAttribute('data-estado') !== 'erro') { estado('pausado'); alvo.setAttribute('aria-label', 'Continuar vídeo'); }
  });
  v.addEventListener('ended', function () {
    pintar();
    if (iniciado) { estado('pausado'); alvo.setAttribute('aria-label', 'Assistir de novo'); }
  });
  v.addEventListener('loadeddata', function () { clearTimeout(vigia); });
  v.addEventListener('timeupdate', pintar);
  v.addEventListener('error', function () { if (v.getAttribute('src')) falhar(); });

  /* ---------- Travas: sem seek, sem velocidade ---------- */
  v.addEventListener('seeking', function () {
    if (permitirSalto) return;
    if (Math.abs(v.currentTime - ultimo) > 1.5) v.currentTime = ultimo;
  });
  v.addEventListener('seeked', function () { pintar(); });
  v.addEventListener('ratechange', function () { if (v.playbackRate !== 1) v.playbackRate = 1; });
  raiz.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  if ('mediaSession' in navigator) {
    ['seekto', 'seekforward', 'seekbackward', 'previoustrack', 'nexttrack'].forEach(function (a) {
      try { navigator.mediaSession.setActionHandler(a, function () {}); } catch (e) { /* ação não suportada */ }
    });
  }

  partir();
})();
