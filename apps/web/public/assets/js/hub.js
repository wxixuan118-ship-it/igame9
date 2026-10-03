/* Hub page: client-side search + category filter */
(function () {
  'use strict';
  var input = document.getElementById('q');
  var buttons = document.querySelectorAll('.filters button');
  var sections = document.querySelectorAll('.cat-section');
  var trending = document.getElementById('trending');
  var results = document.getElementById('results');
  var resultsGrid = document.getElementById('results-grid');
  var none = document.getElementById('no-results');
  // One card per game, taken from the category sections.
  var cards = Array.prototype.slice.call(document.querySelectorAll('.cat-section .card'));
  var filter = 'all';

  function apply() {
    var q = (input.value || '').trim().toLowerCase();
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-filter') === filter ? 'true' : 'false');
    });
    if (q) {
      var terms = q.split(/\s+/);
      resultsGrid.innerHTML = '';
      var hits = cards.filter(function (c) {
        var name = c.getAttribute('data-name');
        var okCat = filter === 'all' || c.getAttribute('data-cat') === filter;
        return okCat && terms.every(function (t) { return name.indexOf(t) !== -1; });
      });
      hits.forEach(function (c) { resultsGrid.appendChild(c.cloneNode(true)); });
      none.hidden = hits.length > 0;
      results.hidden = false;
      trending.hidden = true;
      Array.prototype.forEach.call(sections, function (s) { s.hidden = true; });
      return;
    }
    results.hidden = true;
    trending.hidden = filter !== 'all';
    Array.prototype.forEach.call(sections, function (s) {
      s.hidden = filter !== 'all' && s.getAttribute('data-cat') !== filter;
    });
  }

  input.addEventListener('input', apply);
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-filter');
      apply();
    });
  });
  // Deep links like /#racing preselect that category.
  var hash = location.hash.slice(1);
  if (hash && document.querySelector('.filters [data-filter="' + hash + '"]')) {
    filter = hash;
    apply();
  }
  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1);
    if (document.querySelector('.filters [data-filter="' + h + '"]')) {
      filter = h;
      apply();
    }
  });
})();
