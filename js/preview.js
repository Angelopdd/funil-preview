/* Aviso de demonstração. Só existe na prévia pública. */
(function () {
  'use strict';
  var s = document.createElement('style');
  s.textContent = '.demo-faixa{background:#111;color:#fff;font:600 12px/1.4 Inter,system-ui,sans-serif;letter-spacing:.04em;text-align:center;padding:7px 12px}';
  document.head.appendChild(s);
  var d = document.createElement('div');
  d.className = 'demo-faixa';
  d.textContent = 'VERSÃO DE DEMONSTRAÇÃO · sem vendas, sem pagamento';
  document.body.insertBefore(d, document.body.firstChild);
})();
