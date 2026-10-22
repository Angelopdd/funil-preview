/* Do Bruto ao Pronto com IA · interações da página de vendas.
   Sem dependências. Cada bloco só roda se o elemento existir. */
(function () {
  'use strict';

  /* Endereço do checkout. Enquanto estiver vazio, o botão de compra só mostra um aviso.
     Quando o link existir, basta colar aqui (ex.: 'https://...'). */
  var CHECKOUT_URL = '';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Revelar ao rolar, com 70 ms entre irmãos ---------- */
  function revelar() {
    var itens = $$('[data-rv]');
    if (!('IntersectionObserver' in window) || reduzido) {
      itens.forEach(function (el) { el.classList.add('vis'); });
      return;
    }
    var vistos = new Map();
    itens.forEach(function (el) {
      var irmaos = vistos.get(el.parentNode) || 0;
      el.style.transitionDelay = Math.min(irmaos, 6) * 70 + 'ms';
      vistos.set(el.parentNode, irmaos + 1);
    });
    var obs = new IntersectionObserver(function (lista) {
      lista.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('vis');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    itens.forEach(function (el) { obs.observe(el); });
  }

  /* ---------- Barra fixa do mobile ---------- */
  function barraFixa() {
    var barra = $('#barra'), oferta = $('#comprar'), fim = $('#fim');
    if (!barra) return;
    var naOferta = false, naFim = false, ticking = false;
    var link = $('a', barra);
    function atualizar() {
      ticking = false;
      var mostra = window.scrollY > 600 && !naOferta && !naFim;
      barra.classList.toggle('on', mostra);
      barra.setAttribute('aria-hidden', mostra ? 'false' : 'true');
      link.tabIndex = mostra ? 0 : -1;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(atualizar); }
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (l) {
        l.forEach(function (e) {
          if (e.target === oferta) naOferta = e.isIntersecting;
          if (e.target === fim) naFim = e.isIntersecting;
        });
        atualizar();
      });
      if (oferta) o.observe(oferta);
      if (fim) o.observe(fim);
    }
    atualizar();
  }

  /* ---------- Demonstração: Bruto/Pronto (mobile) e linha do tempo ---------- */
  function demo() {
    var raiz = $('#demo');
    if (!raiz) return;
    var par = $('.demo-par', raiz), tl = $('#tl');
    $$('.seg-b', raiz).forEach(function (b) {
      b.addEventListener('click', function () {
        par.dataset.ativo = b.dataset.ver;
        $$('.seg-b', raiz).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
    function rodar() {
      tl.classList.remove('rodando');
      void tl.offsetWidth;
      tl.classList.add('rodando');
    }
    $('#tl-refazer').addEventListener('click', rodar);
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (l) {
        if (l[0].isIntersecting) { rodar(); o.disconnect(); }
      }, { threshold: 0.4 });
      o.observe(tl);
    }
  }

  /* ---------- Animação das bolhas de conversa (CSS reage à classe .vis do figure) ---------- */

  /* ---------- Carrossel de estilos ---------- */
  function carrossel() {
    var trilho = $('#car'), ant = $('#car-ant'), prox = $('#car-prox');
    if (!trilho) return;
    function passo() {
      var card = $('.car-card', trilho);
      return card ? card.getBoundingClientRect().width + 16 : 260;
    }
    function estado() {
      ant.disabled = trilho.scrollLeft <= 4;
      prox.disabled = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4;
    }
    function ir(dir) {
      trilho.scrollBy({ left: dir * passo() * 2, behavior: reduzido ? 'auto' : 'smooth' });
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

  /* ---------- Comparador bruto x pronto ---------- */
  function comparador() {
    var cmp = $('#cmp');
    if (!cmp) return;
    var campo = $('input', cmp);
    function mover() {
      cmp.style.setProperty('--pos', campo.value + '%');
      campo.setAttribute('aria-valuetext', (100 - campo.value) + '% bruto e ' + campo.value + '% pronto');
    }
    campo.addEventListener('input', mover);
    mover();
  }

  /* ---------- Abas dos benefícios ---------- */
  function abas() {
    var raiz = $('#ben');
    if (!raiz) return;
    var abas = $$('[role="tab"]', raiz);
    function ativar(aba, foco) {
      abas.forEach(function (a) {
        var on = a === aba;
        a.setAttribute('aria-selected', String(on));
        a.tabIndex = on ? 0 : -1;
        document.getElementById(a.getAttribute('aria-controls')).hidden = !on;
      });
      if (foco) aba.focus();
      if (aba.scrollIntoView && raiz.querySelector('.ben-lista').scrollWidth > raiz.querySelector('.ben-lista').clientWidth) {
        aba.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduzido ? 'auto' : 'smooth' });
      }
    }
    abas.forEach(function (aba, i) {
      aba.addEventListener('click', function () { ativar(aba, false); });
      aba.addEventListener('keydown', function (e) {
        var k = e.key, n = abas.length, alvo = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') alvo = abas[(i + 1) % n];
        else if (k === 'ArrowUp' || k === 'ArrowLeft') alvo = abas[(i - 1 + n) % n];
        else if (k === 'Home') alvo = abas[0];
        else if (k === 'End') alvo = abas[n - 1];
        if (alvo) { e.preventDefault(); ativar(alvo, true); }
      });
    });
  }

  /* ---------- Oferta: À vista / Em 12x ---------- */
  function oferta() {
    var preco = $('#preco');
    if (!preco) return;
    $$('.alt-b').forEach(function (b) {
      b.addEventListener('click', function () {
        preco.dataset.modo = b.dataset.pg;
        $$('.alt-b').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
    var botao = $('#btn-checkout'), aviso = $('#aviso-checkout');
    if (!botao) return;
    if (CHECKOUT_URL) {
      botao.href = CHECKOUT_URL;
    } else {
      botao.addEventListener('click', function (e) {
        e.preventDefault();
        aviso.hidden = false;
      });
    }
  }

  /* ---------- Perguntas frequentes ---------- */
  function faq() {
    $$('.faq-q').forEach(function (q) {
      q.addEventListener('click', function () {
        var aberto = q.getAttribute('aria-expanded') === 'true';
        q.setAttribute('aria-expanded', String(!aberto));
      });
    });
  }

  revelar();
  barraFixa();
  demo();
  carrossel();
  comparador();
  abas();
  oferta();
  faq();
})();
