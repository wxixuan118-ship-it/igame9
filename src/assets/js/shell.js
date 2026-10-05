/*!
 * igame9 game shell
 * Mounts a game engine into every .player-frame on the page, or an <iframe>
 * when the frame carries a data-embed URL. Engines register themselves with
 * IGAME.register(id, factory). See README.md → "Game engine contract".
 */
(function () {
  'use strict';

  var IGAME = (window.IGAME = window.IGAME || {});
  var factories = (IGAME._factories = IGAME._factories || {});
  var params = new URLSearchParams(location.search);
  var DEBUG = params.has('debug');

  /* ------------------------------------------------------------------ */
  /* Registry                                                            */
  /* ------------------------------------------------------------------ */
  IGAME.register = function (id, factory) {
    factories[id] = factory;
    document.dispatchEvent(new CustomEvent('igame:registered', { detail: id }));
  };

  /* ------------------------------------------------------------------ */
  /* Storage (namespaced, JSON, never throws)                            */
  /* ------------------------------------------------------------------ */
  function makeStore(ns) {
    var prefix = 'ig:' + ns + ':';
    return {
      get: function (key, def) {
        try {
          var raw = localStorage.getItem(prefix + key);
          return raw == null ? def : JSON.parse(raw);
        } catch (e) {
          return def;
        }
      },
      set: function (key, value) {
        try {
          localStorage.setItem(prefix + key, JSON.stringify(value));
        } catch (e) {}
      },
      remove: function (key) {
        try {
          localStorage.removeItem(prefix + key);
        } catch (e) {}
      },
    };
  }
  IGAME.store = makeStore;
  var shellStore = makeStore('shell');

  /* ------------------------------------------------------------------ */
  /* Sound: tiny WebAudio synth with named presets                       */
  /* ------------------------------------------------------------------ */
  var audioCtx = null;
  var muted = shellStore.get('muted', false);

  function ac() {
    if (muted) return null;
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        audioCtx = new AC();
      } catch (e) {
        return null;
      }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // tone({f, f2, d, type, v, delay})
  function tone(o) {
    var a = ac();
    if (!a) return;
    var t0 = a.currentTime + (o.delay || 0);
    var d = o.d || 0.1;
    var osc = a.createOscillator();
    var g = a.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + d);
    var v = (o.v == null ? 0.15 : o.v) * 0.6;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + d + 0.02);
  }

  function noise(o) {
    var a = ac();
    if (!a) return;
    var d = o.d || 0.15;
    var len = Math.floor(a.sampleRate * d);
    var buf = a.createBuffer(1, len, a.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = a.createBufferSource();
    src.buffer = buf;
    var filt = a.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = o.f || 1200;
    var g = a.createGain();
    g.gain.value = (o.v == null ? 0.2 : o.v) * 0.6;
    src.connect(filt).connect(g).connect(a.destination);
    src.start(a.currentTime + (o.delay || 0));
  }

  var presets = {
    click: function () { tone({ f: 660, d: 0.05, type: 'triangle', v: 0.12 }); },
    tick: function () { tone({ f: 1400, d: 0.03, type: 'square', v: 0.04 }); },
    coin: function () { tone({ f: 988, d: 0.07, type: 'square', v: 0.08 }); tone({ f: 1319, d: 0.12, type: 'square', v: 0.08, delay: 0.06 }); },
    buy: function () { tone({ f: 523, d: 0.08, type: 'triangle', v: 0.14 }); tone({ f: 784, d: 0.12, type: 'triangle', v: 0.14, delay: 0.07 }); },
    jump: function () { tone({ f: 320, f2: 720, d: 0.16, type: 'square', v: 0.07 }); },
    slide: function () { noise({ d: 0.18, f: 900, v: 0.12 }); },
    hit: function () { tone({ f: 180, f2: 50, d: 0.25, type: 'sawtooth', v: 0.18 }); noise({ d: 0.2, f: 600, v: 0.2 }); },
    shoot: function () { noise({ d: 0.09, f: 2600, v: 0.25 }); tone({ f: 220, f2: 70, d: 0.08, type: 'square', v: 0.08 }); },
    merge: function () { tone({ f: 440, f2: 880, d: 0.14, type: 'sine', v: 0.18 }); tone({ f: 1320, d: 0.1, type: 'sine', v: 0.08, delay: 0.1 }); },
    match: function () { tone({ f: 740, d: 0.08, type: 'triangle', v: 0.14 }); tone({ f: 1108, d: 0.12, type: 'triangle', v: 0.12, delay: 0.06 }); },
    error: function () { tone({ f: 200, d: 0.12, type: 'square', v: 0.08 }); tone({ f: 150, d: 0.16, type: 'square', v: 0.08, delay: 0.1 }); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone({ f: f, d: 0.16, type: 'triangle', v: 0.14, delay: i * 0.09 }); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone({ f: f, d: 0.2, type: 'sawtooth', v: 0.07, delay: i * 0.12 }); }); },
    levelup: function () { [659, 784, 988, 1319].forEach(function (f, i) { tone({ f: f, d: 0.1, type: 'square', v: 0.07, delay: i * 0.06 }); }); },
    boost: function () { tone({ f: 200, f2: 900, d: 0.3, type: 'sawtooth', v: 0.06 }); },
    skid: function () { noise({ d: 0.12, f: 3000, v: 0.05 }); },
    explode: function () { noise({ d: 0.45, f: 500, v: 0.35 }); tone({ f: 90, f2: 30, d: 0.4, type: 'sine', v: 0.3 }); },
    pop: function () { tone({ f: 600, f2: 1200, d: 0.06, type: 'sine', v: 0.15 }); },
  };

  function sfx(name, opts) {
    if (muted) return;
    try {
      if (typeof name === 'object') return tone(name);
      if (presets[name]) presets[name](opts);
    } catch (e) {}
  }
  IGAME.sfx = sfx;
  IGAME.sfx.tone = function (o) { if (!muted) try { tone(o); } catch (e) {} };
  IGAME.sfx.noise = function (o) { if (!muted) try { noise(o); } catch (e) {} };
  IGAME.isMuted = function () { return muted; };

  /* ------------------------------------------------------------------ */
  /* Canvas helper: HiDPI, auto-resizing, draws in CSS pixels            */
  /* ------------------------------------------------------------------ */
  IGAME.createCanvas = function (root, opts) {
    opts = opts || {};
    var canvas = document.createElement('canvas');
    canvas.className = 'ig-canvas';
    root.appendChild(canvas);
    var c2d = canvas.getContext('2d', opts.contextAttributes || undefined);
    var api = { canvas: canvas, ctx: c2d, width: 0, height: 0, dpr: 1, destroy: destroy, resize: resize };

    function resize() {
      var r = root.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2);
      var w = Math.max(1, Math.round(r.width));
      var h = Math.max(1, Math.round(r.height));
      if (w === api.width && h === api.height && dpr === api.dpr) return;
      api.width = w;
      api.height = h;
      api.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (opts.onResize) opts.onResize(w, h);
    }

    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(root);
    else window.addEventListener('resize', resize);
    resize();

    function destroy() {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    return api;
  };

  /* ------------------------------------------------------------------ */
  /* Frame loop: dt in seconds, clamped to 0.05 (no huge jumps on resume) */
  /* ------------------------------------------------------------------ */
  IGAME.loop = function (fn) {
    var raf = 0;
    var last = 0;
    var running = false;
    function frame(ts) {
      if (!running) return;
      var dt = last ? (ts - last) / 1000 : 1 / 60;
      last = ts;
      if (dt > 0.05) dt = 0.05;
      try {
        fn(dt, ts / 1000);
      } catch (e) {
        running = false;
        reportError(e);
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    return {
      start: function () {
        if (running) return;
        running = true;
        last = 0;
        raf = requestAnimationFrame(frame);
      },
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
      },
      isRunning: function () {
        return running;
      },
    };
  };

  /* ------------------------------------------------------------------ */
  /* UI helpers (styled by .ig-* classes in site.css)                    */
  /* ------------------------------------------------------------------ */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  IGAME.ui = {
    el: el,
    // overlay(root, {title, text, html, buttons:[{label, primary, onClick}], dismissOnTap})
    overlay: function (root, o) {
      o = o || {};
      var wrap = el('div', 'ig-overlay');
      var panel = el('div', 'ig-panel');
      if (o.title) panel.appendChild(el('div', 'ig-title', o.title));
      if (o.text) panel.appendChild(el('p', 'ig-sub', o.text));
      if (o.html) panel.appendChild(el('div', 'ig-body', o.html));
      var row = el('div', 'ig-actions');
      (o.buttons || []).forEach(function (b) {
        var btn = el('button', 'ig-btn' + (b.primary ? '' : ' secondary'), b.label);
        btn.type = 'button';
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          sfx('click');
          if (b.onClick) b.onClick(e);
        });
        row.appendChild(btn);
      });
      if (row.children.length) panel.appendChild(row);
      wrap.appendChild(panel);
      if (o.dismissOnTap) {
        wrap.addEventListener('pointerdown', function () {
          close();
          o.dismissOnTap();
        });
      }
      root.appendChild(wrap);
      var first = row.querySelector('.ig-btn');
      if (first && o.focus !== false) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) {} }, 30);
      function close() {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
      return { el: wrap, panel: panel, close: close };
    },
    // Toasts stack downward instead of overlapping when several are shown at once.
    toast: function (root, text, ms) {
      var t = el('div', 'ig-toast', text);
      var live = root.querySelectorAll('.ig-toast:not(.out)').length;
      if (live) t.style.top = 'calc(18% + ' + live * 46 + 'px)';
      root.appendChild(t);
      setTimeout(function () { t.classList.add('out'); }, ms || 1400);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, (ms || 1400) + 400);
      return t;
    },
  };

  /* ------------------------------------------------------------------ */
  /* Number formatting for idle games                                    */
  /* ------------------------------------------------------------------ */
  var SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  IGAME.fmt = function (n, digits) {
    if (n == null || isNaN(n)) return '0';
    if (!isFinite(n)) return '∞';
    var neg = n < 0;
    n = Math.abs(n);
    var out;
    if (n < 1000) out = n < 10 && n % 1 ? n.toFixed(digits == null ? 1 : digits) : Math.floor(n).toString();
    else {
      var tier = Math.floor(Math.log10(n) / 3);
      if (tier < SUFFIX.length) {
        var v = n / Math.pow(1000, tier);
        out = v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + SUFFIX[tier];
      } else out = n.toExponential(2).replace('e+', 'e');
    }
    return (neg ? '-' : '') + out;
  };
  IGAME.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + s + 's';
    return s + 's';
  };

  /* ------------------------------------------------------------------ */
  /* Keyboard routing: only the active (last clicked) frame gets keys    */
  /* ------------------------------------------------------------------ */
  var GAME_KEYS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1 };
  var activePlayer = null;

  document.addEventListener(
    'pointerdown',
    function (e) {
      var frame = e.target.closest && e.target.closest('.player-frame');
      if (frame && frame._player) setActive(frame._player);
      else if (!e.target.closest || !e.target.closest('.player-bar')) setActive(null);
    },
    true
  );

  function setActive(p) {
    if (activePlayer === p) return;
    if (activePlayer) {
      activePlayer.frame.classList.remove('is-active');
      releaseAllKeys(activePlayer);
    }
    activePlayer = p;
    if (p) p.frame.classList.add('is-active');
  }

  function releaseAllKeys(p) {
    Object.keys(p.keys).forEach(function (code) {
      if (p.keys[code]) {
        p.keys[code] = false;
        p.keyHandlers.forEach(function (h) { try { h(code, false, null); } catch (e) {} });
      }
    });
  }

  function isTyping(t) {
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  function onKey(e, down) {
    var p = activePlayer;
    if (!p || !p.instance || isTyping(e.target)) return;
    if (down && e.code === 'Escape' && p.box.classList.contains('is-pseudo-fs')) {
      toggleFullscreen(p);
      return;
    }
    if (GAME_KEYS[e.code] || p.extraKeys[e.code]) e.preventDefault();
    if (down && e.repeat && p.keys[e.code]) return;
    p.keys[e.code] = down;
    p.keyHandlers.forEach(function (h) {
      try { h(e.code, down, e); } catch (err) { reportError(err); }
    });
  }
  window.addEventListener('keydown', function (e) { onKey(e, true); });
  window.addEventListener('keyup', function (e) { onKey(e, false); });
  window.addEventListener('blur', function () { if (activePlayer) releaseAllKeys(activePlayer); });

  /* ------------------------------------------------------------------ */
  /* Players                                                             */
  /* ------------------------------------------------------------------ */
  function reportError(err) {
    if (window.console) console.error('[igame9]', err);
    if (!DEBUG) return;
    var box = document.getElementById('ig-errors');
    if (!box) {
      box = el('pre', '');
      box.id = 'ig-errors';
      box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:40vh;overflow:auto;margin:0;padding:10px;background:#300;color:#fdd;font:12px/1.4 monospace;z-index:99999;white-space:pre-wrap';
      document.body.appendChild(box);
    }
    box.textContent += (err && err.stack ? err.stack : String(err)) + '\n';
  }
  IGAME.reportError = reportError;
  if (DEBUG) {
    window.addEventListener('error', function (e) { reportError(e.error || e.message); });
    window.addEventListener('unhandledrejection', function (e) { reportError(e.reason); });
  }

  function Player(frame) {
    this.frame = frame;
    this.stage = frame.querySelector('.player-stage');
    this.engine = frame.getAttribute('data-engine');
    this.variant = frame.getAttribute('data-variant') || 'default';
    this.title = frame.getAttribute('data-title') || '';
    this.slug = frame.getAttribute('data-slug') || this.engine;
    this.embed = frame.getAttribute('data-embed') || '';
    this.keys = {};
    this.keyHandlers = [];
    this.extraKeys = {};
    this.instance = null;
    this.box = frame.parentNode; // .player: frame + toolbar, the element that goes fullscreen
    this.bar = this.box.querySelector('.player-bar');
    frame._player = this;
  }

  Player.prototype.mount = function () {
    var self = this;
    if (this.embed) return this.mountEmbed();
    var factory = factories[this.engine];
    if (!factory) {
      // engine script is loaded with defer after shell.js; wait for it.
      var onReg = function (e) {
        if (e.detail === self.engine) {
          document.removeEventListener('igame:registered', onReg);
          self.mount();
        }
      };
      document.addEventListener('igame:registered', onReg);
      return;
    }
    this.stage.innerHTML = '';
    this.keys = {};
    this.keyHandlers = [];
    this.extraKeys = {};
    var store = makeStore(this.slug);
    var ctx = {
      root: this.stage,
      frame: this.frame,
      variant: this.variant,
      title: this.title,
      slug: this.slug,
      params: params,
      debug: DEBUG,
      store: store,
      sfx: sfx,
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      keys: this.keys,
      onKey: function (fn) { self.keyHandlers.push(fn); },
      // claim extra key codes (e.g. 'KeyW') so the page doesn't react to them
      captureKeys: function (codes) { codes.forEach(function (c) { self.extraKeys[c] = 1; }); },
      isActive: function () { return activePlayer === self; },
      focus: function () { setActive(self); },
    };
    this.ctx = ctx;
    try {
      this.instance = factory(ctx) || {};
    } catch (e) {
      reportError(e);
      this.stage.innerHTML =
        '<div class="ig-overlay"><div class="ig-panel"><div class="ig-title">Something went wrong</div><p class="ig-sub">Please reload the page to try again.</p></div></div>';
      this.instance = {};
    }
    this.frame.classList.add('is-mounted');
  };

  Player.prototype.mountEmbed = function () {
    var self = this;
    var cover = this.frame.querySelector('.player-cover');
    if (!cover) return;
    cover.hidden = false;
    cover.querySelector('button').addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = self.embed;
      iframe.title = self.title || 'Game';
      iframe.setAttribute('allow', 'autoplay; fullscreen; gamepad; clipboard-write');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.className = 'player-iframe';
      self.stage.innerHTML = '';
      self.stage.appendChild(iframe);
      cover.hidden = true;
      self.instance = { embed: true };
      self.frame.classList.add('is-mounted');
    });
  };

  Player.prototype.destroy = function () {
    if (this.instance && this.instance.destroy) {
      try { this.instance.destroy(); } catch (e) { reportError(e); }
    }
    this.instance = null;
    this.stage.innerHTML = '';
  };

  Player.prototype.restart = function () {
    if (this.embed) {
      var iframe = this.stage.querySelector('iframe');
      if (iframe) iframe.src = iframe.src;
      return;
    }
    this.destroy();
    this.mount();
    setActive(this);
  };

  function toggleFullscreen(p) {
    var box = p.box;
    var doc = document;
    var fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (fsEl) {
      (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      return;
    }
    if (box.classList.contains('is-pseudo-fs')) {
      box.classList.remove('is-pseudo-fs');
      document.documentElement.classList.remove('ig-noscroll');
      syncFsButton(p, false);
      return;
    }
    var req = box.requestFullscreen || box.webkitRequestFullscreen;
    if (req) {
      var r = req.call(box);
      if (r && r.catch) r.catch(function () { pseudo(); });
    } else pseudo();
    function pseudo() {
      box.classList.add('is-pseudo-fs');
      document.documentElement.classList.add('ig-noscroll');
      syncFsButton(p, true);
    }
    setActive(p);
  }

  function syncFsButton(p, on) {
    var btn = p.bar && p.bar.querySelector('[data-act="fullscreen"]');
    if (!btn) return;
    btn.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Fullscreen');
    btn.title = on ? 'Exit fullscreen' : 'Fullscreen';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function bindBar(p) {
    if (!p.bar) return;
    var btnFs = p.bar.querySelector('[data-act="fullscreen"]');
    var btnMute = p.bar.querySelector('[data-act="mute"]');
    var btnRestart = p.bar.querySelector('[data-act="restart"]');
    if (btnFs) btnFs.addEventListener('click', function () { toggleFullscreen(p); });
    if (btnRestart) btnRestart.addEventListener('click', function () { p.restart(); });
    if (btnMute) {
      var sync = function () {
        btnMute.setAttribute('aria-pressed', muted ? 'true' : 'false');
        btnMute.classList.toggle('is-off', muted);
        btnMute.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
        btnMute.title = muted ? 'Sound off' : 'Sound on';
      };
      sync();
      btnMute.addEventListener('click', function () {
        muted = !muted;
        shellStore.set('muted', muted);
        sync();
        if (!muted) sfx('click');
      });
    }
  }

  function init() {
    var frames = document.querySelectorAll('.player-frame');
    Array.prototype.forEach.call(frames, function (frame) {
      var p = new Player(frame);
      bindBar(p);
      p.mount();
    });
  }

  document.addEventListener('visibilitychange', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.player-frame'), function (f) {
      var inst = f._player && f._player.instance;
      if (!inst) return;
      try {
        if (document.hidden) inst.pause && inst.pause();
        else inst.resume && inst.resume();
      } catch (e) { reportError(e); }
    });
    if (document.hidden && activePlayer) releaseAllKeys(activePlayer);
  });

  function onFsChange() {
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    Array.prototype.forEach.call(document.querySelectorAll('.player-frame'), function (f) {
      var p = f._player;
      if (!p) return;
      var on = fsEl === p.box;
      p.box.classList.toggle('is-fs', on);
      syncFsButton(p, on);
    });
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
