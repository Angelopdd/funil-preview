/* Do Bruto ao Pronto com IA · interações do upsell.
   A revelação ao rolar vem de pagina.js. Aqui ficam o carrossel da galeria e os dois links de decisão. */
(function () {
  'use strict';

  /* Endereço do pagamento do Arsenal e destino de quem recusa.
     Enquanto estiverem vazios, os dois links só mostram um aviso.
     Quando existirem, basta colar aqui (ex.: 'https://...'). */
  var LINK_ACEITE = '';
  var LINK_RECUSA = '';

  var reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Galeria: setas no desktop, deslize no toque ---------- */
  function galeria() {
    var trilho = document.getElementById('up-trilho');
    var ant = document.getElementById('up-ant'), prox = document.getElementById('up-prox');
    if (!trilho || !ant || !prox) return;
    function passo() {
      var card = trilho.querySelector('li');
      return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(trilho.firstElementChild).columnGap || 0) : 300;
    }
    function estado() {
      ant.disabled = trilho.scrollLeft <= 4;
      prox.disabled = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4;
    }
    function ir(dir) {
      trilho.scrollBy({ left: dir * passo() * (window.innerWidth >= 900 ? 3 : 1), behavior: reduzido ? 'auto' : 'smooth' });
    }
    ant.addEventListener('click', function () { ir(-1); });
    prox.addEventListener('click', function () { ir(1); });
    trilho.addEventListener('scroll', function () { requestAnimationFrame(estado); }, { passive: true });
    trilho.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); ir(-1); }
    });
    window.addEventListener('resize', estado);
    estado();
  }

  /* ---------- Aceite e recusa ---------- */
  function ligar(idLink, idAviso, destino) {
    var link = document.getElementById(idLink), aviso = document.getElementById(idAviso);
    if (!link) return;
    if (destino) { link.href = destino; return; }
    link.addEventListener('click', function (e) {
      e.preventDefault();
      aviso.hidden = false;
    });
  }

  galeria();
  ligar('btn-aceite', 'aviso-aceite', LINK_ACEITE);
  ligar('btn-recusa', 'aviso-recusa', LINK_RECUSA);
})();
