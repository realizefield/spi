/* SPI 漢字・語句プログラム 共通エンジン（江原予備校） */
(function () {
  'use strict';
  var KEY = 'spiKanji.v1';
  var mem = null;
  var COMBO = [[0], [1], [2], [0, 1], [0, 2], [1, 2]];
  var COMBO_L = ['アだけ', 'イだけ', 'ウだけ', 'アとイ', 'アとウ', 'イとウ'];
  var LET = 'ABCDEFGH';
  var KANA = 'アイウ';
  var SETNAME = ['A', 'B'];

  /* ---------- 保存 ---------- */
  function load() {
    try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {}
    return mem || { sets: {}, weak: {} };
  }
  function save(d) { mem = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function reset() { mem = { sets: {}, weak: {} }; try { localStorage.removeItem(KEY); } catch (e) {} }

  /* ---------- 小道具 ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(s) { return esc(s).replace(/\[\[(.+?)\]\]/g, '<u>$1</u>'); }
  function plain(s) { return String(s).replace(/\[\[(.+?)\]\]/g, '$1'); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- 問題の選択肢 ---------- */
  function comboCorrect(q) {
    var ok = []; for (var i = 0; i < q.i.length; i++) if (q.i[i][2]) ok.push(i);
    for (var k = 0; k < COMBO.length; k++) if (COMBO[k].join() === ok.join()) return k;
    return -1;
  }
  function optionsOf(q, doShuffle) {
    var o = [], i;
    if (q.t === 'tf') {
      o = [{ h: '正', ok: q.a === true }, { h: '誤', ok: q.a === false }];
    } else if (q.t === 'm') {
      var c = comboCorrect(q);
      for (i = 0; i < 6; i++) o.push({ h: '<span class="l">' + LET[i] + '</span>' + COMBO_L[i], ok: i === c, plain: LET[i] + ' ' + COMBO_L[i] });
    } else {
      var idx = []; for (i = 0; i < q.c.length; i++) idx.push(i);
      if (doShuffle && !q.fx) idx = shuffle(idx);
      for (i = 0; i < idx.length; i++) o.push({ h: '<span class="l">' + LET[i] + '</span>' + esc(q.c[idx[i]]), ok: idx[i] === q.a, plain: LET[i] + ' ' + q.c[idx[i]] });
    }
    return o;
  }
  function insFor(q, page) {
    if (q.t === 'm') return page.ins_m || page.ins;
    if (q.t === 'f') return page.ins_f || page.ins;
    return page.ins;
  }

  /* ---------- 1問を描画 ---------- */
  function renderQ(q, no, opts) {
    opts = opts || {};
    var box = h('div', 'q');
    var head = h('div', 'head');
    head.appendChild(h('div', 'qno', String(no)));
    var stem = h('div', 'stem');
    if (q.t === 'tf') {
      stem.innerHTML = fmt(q.q);
    } else if (q.t === 'c') {
      stem.innerHTML = q.fx ? '<span class="pair">' + esc(q.q) + '</span>' : fmt(q.q);
    } else if (q.t === 'f') {
      stem.innerHTML = '<div class="pair">' + esc(q.b[0]) + '<span class="x">：</span>' + esc(q.b[1]) + '</div>' +
        '<div class="pair q2">' + esc(q.x) + '<span class="x">：</span>（　？　）</div>';
    } else if (q.t === 'm') {
      var s = '<div class="pair">' + esc(q.b[0]) + '<span class="x">：</span>' + esc(q.b[1]) + '</div><ul class="items">';
      for (var i = 0; i < q.i.length; i++) s += '<li><b>' + KANA[i] + '</b>' + esc(q.i[i][0]) + '：' + esc(q.i[i][1]) + '</li>';
      stem.innerHTML = s + '</ul>';
    }
    head.appendChild(stem);
    box.appendChild(head);

    var o = optionsOf(q, opts.shuffle !== false);
    var wrap = h('div', 'opts' + (q.t === 'tf' ? ' tfopts' : ' col'));
    var fb = h('div', 'fb'); fb.style.display = 'none';
    var done = false, btns = [];
    function finish(chosen) {
      if (done) return; done = true;
      var okAns = o.filter(function (x) { return x.ok; })[0];
      var correct = chosen != null && o[chosen].ok;
      for (var k = 0; k < btns.length; k++) {
        btns[k].disabled = true;
        if (o[k].ok) btns[k].classList.add('ok');
        else if (k === chosen) btns[k].classList.add('ng');
      }
      var ansTxt = q.t === 'tf' ? (q.a ? '正' : '誤') : esc(okAns.plain);
      fb.className = 'fb ' + (chosen == null ? 'rv' : (correct ? 'ok' : 'ng'));
      fb.innerHTML = '<div class="v">' + (correct ? '○ 正解！' : (chosen == null ? '正解は　' : '× ざんねん。正解は　') + ansTxt) + '</div>' + esc(q.e);
      if (correct && opts.okSuffix) fb.innerHTML += opts.okSuffix;
      fb.style.display = '';
      if (opts.onDone && chosen != null) opts.onDone(correct, q);
    }
    o.forEach(function (x, k) {
      var b = h('button', null, x.h); b.type = 'button';
      b.addEventListener('click', function () { finish(k); });
      wrap.appendChild(b); btns.push(b);
    });
    box.appendChild(wrap); box.appendChild(fb);
    box._reveal = function () { finish(null); };
    box._done = function () { return done; };
    return box;
  }

  /* ---------- セット（5問） ---------- */
  function statusOf(d, key) {
    var r = d.sets[key];
    if (!r) return { c: '', t: '未挑戦', lv: 0 };
    if (r.best >= r.total) return { c: 'star', t: '★' + r.best + '/' + r.total + '満点', lv: 3 };
    if (r.best / r.total >= 0.8) return { c: 'ok', t: '✓' + r.best + '/' + r.total + '達成', lv: 2 };
    return { c: 'try', t: r.best + '/' + r.total + '挑戦済み(80%未満)', lv: 1 };
  }
  function weakKey(pid, si, qi) { return pid + '-' + SETNAME[si] + '-' + qi; }

  function mountSet(page, si, host, onStatus) {
    host.innerHTML = '';
    var qs = page.sets[si], n = qs.length, answered = 0, score = 0, t0 = null, wrongs = [];
    var list = h('div'); host.appendChild(list);
    var resultHost = h('div'); host.appendChild(resultHost);
    qs.forEach(function (q, qi) {
      var el = renderQ(q, qi + 1, {
        onDone: function (correct) {
          if (t0 == null) t0 = Date.now();
          answered++; if (correct) score++; else wrongs.push(qi);
          var d = load();
          if (correct) delete d.weak[weakKey(page.id, si, qi)];
          else d.weak[weakKey(page.id, si, qi)] = { pid: page.id, title: page.title, ins: insFor(q, page), q: q };
          save(d);
          if (answered === n) showResult();
        }
      });
      list.appendChild(el);
    });
    t0 = Date.now();
    function showResult() {
      var sec = Math.round((Date.now() - t0) / 1000);
      var d = load(), key = page.id + '-' + SETNAME[si];
      var r = d.sets[key] || { best: 0, total: n, tries: 0 };
      r.best = Math.max(r.best, score); r.total = n; r.tries = (r.tries || 0) + 1; d.sets[key] = r; save(d);
      var msg = score === n ? '⭐ 満点！すばらしい！' : (score / n >= 0.8 ? '✅ 達成！（80%以上）' : 'もう少し！80%以上で達成です');
      var box = h('div', 'result');
      box.innerHTML = '<div class="score">' + score + ' / ' + n + '</div><div class="msg">' + msg + '</div>' +
        '<div class="kbox">かかった時間：約' + sec + '秒' + (page.ch === 'k' ? '（目安：1問3秒＝5問で15秒）' : '') + '</div>';
      var row = h('div', 'row'); row.style.justifyContent = 'center';
      var again = h('button', 'btn', '🔁 もう一度（選択肢をシャッフル）'); again.type = 'button';
      again.onclick = function () { mountSet(page, si, host, onStatus); host.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      row.appendChild(again);
      if (wrongs.length) { var w = h('a', 'btn sub', '📌 苦手カードを見る'); w.style.textDecoration = 'none'; w.style.display = 'inline-flex'; w.style.alignItems = 'center'; w.href = 'weak.html'; row.appendChild(w); }
      box.appendChild(row);
      resultHost.innerHTML = ''; resultHost.appendChild(box);
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (onStatus) onStatus();
    }
  }

  /* ---------- 印刷 ---------- */
  function qPlain(q, no) {
    var s = '<div class="pq"><b>' + no + '.</b> ';
    if (q.t === 'tf') s += esc(plain(q.q)) + '　（　正　・　誤　）';
    else if (q.t === 'c') s += esc(q.q) + '<div class="c">' + q.c.map(function (x, i) { return LET[i] + ' ' + esc(x); }).join('　　') + '</div>';
    else if (q.t === 'f') s += esc(q.b[0]) + '：' + esc(q.b[1]) + '　＝　' + esc(q.x) + '：（　？　）<div class="c">' + q.c.map(function (x, i) { return LET[i] + ' ' + esc(x); }).join('　　') + '</div>';
    else { s += esc(q.b[0]) + '：' + esc(q.b[1]) + '<div class="c">' + q.i.map(function (it, i) { return KANA[i] + ' ' + esc(it[0]) + '：' + esc(it[1]); }).join('<br>') + '</div><div class="c">' + COMBO_L.map(function (x, i) { return LET[i] + ' ' + x; }).join('　　') + '</div>'; }
    return s + '</div>';
  }
  function ansPlain(q, no) {
    var a;
    if (q.t === 'tf') a = q.a ? '正' : '誤';
    else if (q.t === 'm') { var c = comboCorrect(q); a = LET[c] + ' ' + COMBO_L[c]; }
    else a = LET[q.a] + ' ' + q.c[q.a];
    return '<div class="ans"><b>' + no + '.</b> 正解：' + esc(a) + '<br>' + esc(q.e) + '</div>';
  }
  function printSheet(page) {
    var pa = document.getElementById('printArea');
    var s = '<h1>' + esc(page.title) + '　練習問題プリント</h1><div>江原予備校　名前（　　　　　　　　）</div>';
    var hasIns = page.ins_m ? (esc(page.ins_m) + '<br>' + esc(page.ins_f)) : esc(page.ins);
    s += '<p>' + hasIns + '</p>';
    var no = 1;
    page.sets.forEach(function (qs, si) { s += '<h2>セット' + SETNAME[si] + '</h2>'; qs.forEach(function (q) { s += qPlain(q, no++); }); });
    s += '<div class="pagebreak"></div><h1>解答・解説</h1>'; no = 1;
    page.sets.forEach(function (qs, si) { s += '<h2>セット' + SETNAME[si] + '</h2>'; qs.forEach(function (q) { s += ansPlain(q, no++); }); });
    pa.innerHTML = s;
    document.body.classList.add('printing');
    var clean = function () { document.body.classList.remove('printing'); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    window.print();
  }

  /* ---------- 各ページの起動 ---------- */
  function initPattern() {
    var page = window.PAGE; if (!page) return;
    // 例題
    var exHost = document.getElementById('example-host');
    if (exHost) {
      var els = [];
      page.ex.forEach(function (q, i) { var el = renderQ(q, i + 1, { shuffle: false }); els.push(el); exHost.appendChild(el); });
      var b = h('button', 'btn sub', '答えと解説を見る'); b.type = 'button';
      b.onclick = function () { els.forEach(function (e) { e._reveal(); }); b.style.display = 'none'; };
      exHost.appendChild(b);
    }
    // 練習
    function refresh() {
      var d = load();
      page.sets.forEach(function (qs, si) {
        var st = statusOf(d, page.id + '-' + SETNAME[si]);
        var bd = document.getElementById('badge-' + si);
        if (bd) { bd.className = 'badge ' + st.c; bd.textContent = st.t; }
      });
    }
    page.sets.forEach(function (qs, si) {
      var host = document.getElementById('set-' + si);
      if (host) mountSet(page, si, host, refresh);
    });
    refresh();
    var pb = document.getElementById('print-btn');
    if (pb) pb.onclick = function () { printSheet(page); };
  }

  function initIndex() {
    var idx = window.INDEX; if (!idx) return;
    var d = load(), tot = 0, clear = 0, master = 0;
    idx.patterns.forEach(function (p) {
      var el = document.getElementById('st-' + p.id); if (!el) return;
      var html = '', lv = [];
      for (var si = 0; si < p.sets; si++) {
        var st = statusOf(d, p.id + '-' + SETNAME[si]); lv.push(st.lv);
        html += '<span class="' + st.c + '">' + SETNAME[si] + ' ' + st.t + '</span>';
      }
      var min = Math.min.apply(null, lv);
      if (min >= 3) html += '<span class="star">⭐ マスター</span>'; else if (min >= 2) html += '<span class="ok">✅ クリア</span>';
      el.innerHTML = html; tot++;
      if (min >= 2) clear++; if (min >= 3) master++;
    });
    var sm = document.getElementById('summary');
    if (sm) sm.innerHTML = '✅ クリア <b>' + clear + '</b> ／ ⭐ マスター <b>' + master + '</b> ／ 全 ' + tot + ' パターン';
    var wc = document.getElementById('weak-count');
    if (wc) wc.textContent = Object.keys(d.weak).length;
    var rb = document.getElementById('reset-btn');
    if (rb) rb.onclick = function () {
      if (window.confirm('達成度と苦手カードをすべて消します。よろしいですか？')) { reset(); location.reload(); }
    };
  }

  function initWeak() {
    var host = document.getElementById('weak-host'); if (!host) return;
    function draw() {
      var d = load(), keys = Object.keys(d.weak);
      host.innerHTML = '';
      document.getElementById('weak-num').textContent = keys.length;
      if (!keys.length) { host.appendChild(h('div', 'card', '苦手カードはありません。🎉 まちがえた問題がここに集まります。')); return; }
      keys.sort().forEach(function (k, i) {
        var w = d.weak[k];
        var card = h('div', 'card');
        card.appendChild(h('div', 'ins', esc(w.title) + '　／　' + esc(w.ins)));
        var q = renderQ(w.q, i + 1, {
          onDone: function (correct) {
            if (correct) { var dd = load(); delete dd.weak[k]; save(dd); document.getElementById('weak-num').textContent = Object.keys(dd.weak).length; }
          },
          okSuffix: '<div class="v" style="margin-top:6px">🎉 苦手を克服！このカードは外れました。</div>'
        });
        card.appendChild(q);
        host.appendChild(card);
      });
    }
    draw();
    var cl = document.getElementById('weak-clear');
    if (cl) cl.onclick = function () { if (window.confirm('苦手カードをすべて消します。よろしいですか？')) { var d = load(); d.weak = {}; save(d); draw(); } };
    var rd = document.getElementById('weak-redraw');
    if (rd) rd.onclick = draw;
  }

  document.addEventListener('DOMContentLoaded', function () { initPattern(); initIndex(); initWeak(); });
  window.SpiKanji = { renderQ: renderQ, statusOf: statusOf, load: load, comboCorrect: comboCorrect };
})();
