/* What do you know about Wen? — a text quiz in the spirit of LogoRush.
   10 random questions per round, 4 options, 1 correct, no levels.
   No tracking, no cookies: the only thing kept is your own best score in this browser (localStorage). */
(function () {
  var DATA = window.WEN_QUIZ || [];
  var ROUND = 10, BASE = 100, BONUS_MAX = 50, BONUS_STEP = 5;
  var MIX = { fun: 3, basic: 3, tech: 3, extra: 1 }; // extra = safety or world
  var BEST_KEY = 'wen-quiz-best';

  var $ = function (id) { return document.getElementById(id); };
  var root = $('quiz-app');
  if (!root || !DATA.length) return;

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getBest() { try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; } }
  function setBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }

  function pickRound() {
    var by = { fun: [], basic: [], tech: [], extra: [] };
    DATA.forEach(function (q, i) {
      var k = (q.lv === 'safety' || q.lv === 'world') ? 'extra' : q.lv;
      (by[k] || by.basic).push(i);
    });
    var picked = [];
    Object.keys(MIX).forEach(function (k) { picked = picked.concat(shuffle(by[k]).slice(0, MIX[k])); });
    if (picked.length < ROUND) {
      var rest = shuffle(DATA.map(function (_, i) { return i; }).filter(function (i) { return picked.indexOf(i) < 0; }));
      picked = picked.concat(rest.slice(0, ROUND - picked.length));
    }
    return shuffle(picked).map(function (i) {
      var q = DATA[i];
      var opts = shuffle(q.o.map(function (text, n) { return { text: text, ok: n === 0 }; }));
      return { q: q, opts: opts };
    });
  }

  var state;
  function start() {
    state = { round: pickRound(), n: 0, score: 0, correct: 0, t0: 0, timer: null, missed: [] };
    show();
  }

  function show() {
    var item = state.round[state.n];
    var html = ''
      + '<div class="quiz-top"><span class="quiz-progress">Question ' + (state.n + 1) + ' / ' + ROUND + '</span>'
      + '<span class="quiz-score">Score: <strong>' + state.score + '</strong></span>'
      + '<span class="quiz-time" id="quiz-time">+' + BONUS_MAX + '</span></div>'
      + '<div class="quiz-bar"><span style="width:' + (state.n / ROUND * 100) + '%"></span></div>'
      + '<h2 class="quiz-q">' + esc(item.q.q) + '</h2>'
      + '<div class="quiz-opts">';
    item.opts.forEach(function (o, i) {
      html += '<button type="button" class="quiz-opt" data-i="' + i + '"><span class="quiz-key">' + 'ABCD'[i] + '</span>' + esc(o.text) + '</button>';
    });
    html += '</div><div id="quiz-card" aria-live="polite"></div>';
    root.innerHTML = html;
    Array.prototype.forEach.call(root.querySelectorAll('.quiz-opt'), function (b) {
      b.addEventListener('click', function () { answer(parseInt(b.getAttribute('data-i'), 10)); });
    });
    state.t0 = Date.now();
    clearInterval(state.timer);
    state.timer = setInterval(function () {
      var el = $('quiz-time'); if (el) el.textContent = '+' + bonus();
    }, 250);
    var first = root.querySelector('.quiz-opt'); if (first) first.focus({ preventScroll: true });
  }

  function bonus() {
    var s = Math.floor((Date.now() - state.t0) / 1000);
    return Math.max(0, BONUS_MAX - BONUS_STEP * s);
  }

  function answer(i) {
    if (state.locked) return;
    state.locked = true;
    clearInterval(state.timer);
    var item = state.round[state.n];
    var chosen = item.opts[i];
    var gained = 0;
    if (chosen.ok) { gained = BASE + bonus(); state.score += gained; state.correct++; }
    else { state.missed.push(item.q); }
    Array.prototype.forEach.call(root.querySelectorAll('.quiz-opt'), function (b, k) {
      b.disabled = true;
      if (item.opts[k].ok) b.classList.add('is-right');
      else if (k === i) b.classList.add('is-wrong');
    });
    var last = state.n === ROUND - 1;
    $('quiz-card').innerHTML = '<div class="quiz-card ' + (chosen.ok ? 'ok' : 'bad') + '">'
      + '<p class="quiz-verdict">' + (chosen.ok ? 'Right! +' + gained : 'Not quite — the answer is: <strong>' + esc(item.q.o[0]) + '</strong>') + '</p>'
      + '<p>' + esc(item.q.f) + '</p>'
      + '<p class="quiz-more"><a href="' + esc(item.q.l) + '" target="_blank" rel="noopener">Read more &rarr;</a></p>'
      + '<button type="button" class="quiz-next" id="quiz-next">' + (last ? 'See my result' : 'Next question') + '</button></div>';
    var s = root.querySelector('.quiz-score strong'); if (s) s.textContent = state.score;
    $('quiz-next').addEventListener('click', function () {
      state.locked = false;
      if (last) finish(); else { state.n++; show(); }
    });
    $('quiz-next').focus({ preventScroll: true });
  }

  function rank(c) {
    if (c >= 10) return ['Wen legend', 'Flawless. The cat bows to you.'];
    if (c >= 8) return ['Wen scholar', 'You clearly read the almanac. One more round for the perfect ten?'];
    if (c >= 5) return ['Wen explorer', 'Solid ground. The cards above are your shortcut to the next rank.'];
    if (c >= 3) return ['Curious kitten', 'A good start — every wrong answer came with a card to learn from.'];
    return ['Newborn kitten', 'Everyone starts here. Read a card or two and try again.'];
  }

  function finish() {
    var best = getBest(), isBest = state.score > best;
    if (isBest) setBest(state.score);
    var r = rank(state.correct);
    var max = ROUND * (BASE + BONUS_MAX);
    var html = '<div class="quiz-end">'
      + '<p class="quiz-rank">' + r[0] + '</p>'
      + '<p class="quiz-total"><strong>' + state.score + '</strong> <span>/ ' + max + ' points</span></p>'
      + '<p>' + state.correct + ' of ' + ROUND + ' correct. ' + r[1] + '</p>'
      + '<p class="quiz-best">' + (isBest ? 'New personal best!' : 'Your best: ' + best) + '</p>'
      + '<button type="button" class="quiz-next" id="quiz-again">Play again</button>';
    if (state.missed.length) {
      html += '<h3>Worth a second look</h3><ul class="quiz-missed">';
      state.missed.forEach(function (q) {
        html += '<li><strong>' + esc(q.q) + '</strong><br>' + esc(q.o[0]) + ' — <a href="' + esc(q.l) + '">read more</a></li>';
      });
      html += '</ul>';
    }
    html += '</div>';
    root.innerHTML = html;
    $('quiz-again').addEventListener('click', start);
    $('quiz-again').focus({ preventScroll: true });
  }

  document.addEventListener('keydown', function (e) {
    if (!state || state.locked) return;
    var k = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 }[String(e.key).toLowerCase()];
    if (k !== undefined && root.querySelector('.quiz-opt')) answer(k);
  });

  var startBtn = $('quiz-start');
  if (startBtn) startBtn.addEventListener('click', function () {
    var intro = $('quiz-intro'); if (intro) intro.hidden = true;
    root.hidden = false; start();
  });
  var bestEl = $('quiz-best-intro');
  if (bestEl) { var b = getBest(); if (b) bestEl.textContent = 'Your best so far: ' + b + ' points.'; }
})();
