/**
 * views.js —— 全部视图渲染与交互
 * 视图清单：引导页 / 城市推荐 / 关键词流程 / 推荐结果 / 打卡点 / 便签墙 / 足迹 / 设置
 * 约定：每个 render 函数接收容器 el，渲染完成后返回
 */
(function (global) {
  'use strict';

  var D = global.AppData;
  var S = global.AppStore;
  var L = global.AppLLM;
  var M = global.AppMap;

  /* ================= 工具函数 ================= */

  /** HTML 转义，防止便签文本注入 */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 时间格式化：YYYY-MM-DD HH:mm（前端展示统一此格式） */
  function fmtTime(ts) {
    var d = new Date(ts);
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /** 轻提示 */
  function toast(msg, ms) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('leaving');
      setTimeout(function () { el.remove(); }, 300);
    }, ms || 2200);
  }

  /** 跳转 */
  function go(hash) { location.hash = '#' + hash; }

  /** 渲染到容器并附加进入动画 */
  function mount(el, html) {
    el.innerHTML = html;
    el.className = 'view-enter';
    window.scrollTo(0, 0);
  }

  /* ================= 1. 引导页 ================= */

  function renderWelcome(el) {
    var lines = D.WELCOME_LINES.map(function (t) {
      return '<span class="line">' + esc(t) + '</span>';
    }).join('');

    mount(el, '' +
      '<div class="welcome-wrap">' +
      // 手绘太阳
      '<svg class="welcome-deco sun" width="90" height="90" viewBox="0 0 90 90">' +
      '<circle cx="45" cy="45" r="22" fill="#f2c14e" stroke="#4a4039" stroke-width="3"/>' +
      '<g stroke="#4a4039" stroke-width="3" stroke-linecap="round">' +
      '<line x1="45" y1="8" x2="45" y2="18"/><line x1="45" y1="72" x2="45" y2="82"/>' +
      '<line x1="8" y1="45" x2="18" y2="45"/><line x1="72" y1="45" x2="82" y2="45"/>' +
      '<line x1="19" y1="19" x2="26" y2="26"/><line x1="64" y1="64" x2="71" y2="71"/>' +
      '<line x1="19" y1="71" x2="26" y2="64"/><line x1="64" y1="26" x2="71" y2="19"/>' +
      '</g></svg>' +
      // 云朵两朵
      '<svg class="welcome-deco cloud1" width="110" height="60" viewBox="0 0 110 60">' +
      '<path d="M 20 45 q -12 -2 -10 -14 q 2 -11 14 -10 q 3 -12 18 -12 q 15 0 18 12 q 13 -2 15 9 q 2 12 -11 15 z" fill="#fffdf6" stroke="#4a4039" stroke-width="3"/>' +
      '</svg>' +
      '<svg class="welcome-deco cloud2" width="90" height="50" viewBox="0 0 110 60">' +
      '<path d="M 20 45 q -12 -2 -10 -14 q 2 -11 14 -10 q 3 -12 18 -12 q 15 0 18 12 q 13 -2 15 9 q 2 12 -11 15 z" fill="#fffdf6" stroke="#4a4039" stroke-width="3"/>' +
      '</svg>' +

      '<div class="welcome-lines">' + lines + '</div>' +
      '<p class="welcome-sub">回答三个小问题，让心情替你选一座城</p>' +
      '<div class="welcome-start"><button class="crayon-btn primary" id="btn-start">开始探索 →</button></div>' +

      // 脚印虚线小径
      '<svg class="welcome-path" width="300" height="60" viewBox="0 0 300 60">' +
      '<path d="M 10 45 Q 80 10 150 35 T 290 20" fill="none" stroke="#b9ac9c" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round"/>' +
      '<circle cx="10" cy="45" r="5" fill="#d94f3d"/>' +
      '<path d="M 282 15 l 10 5 l -10 5" fill="none" stroke="#d94f3d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '</div>');

    el.querySelector('#btn-start').addEventListener('click', function () {
      S.markOnboarded();
      console.log('[CityWalk] 完成引导，进入城市推荐');
      go('/recommend');
    });
  }

  /* ================= 2. 城市推荐主页（城市图鉴） ================= */

  function renderRecommend(el) {
    var visited = S.getVisited();
    var visitedIds = Object.keys(visited);
    var trip = S.getTrip();
    var llmOn = L.isConfigured();

    // 当前旅程横幅
    var tripBanner = '';
    if (trip) {
      var tripCity = D.getCity(trip.cityId);
      if (tripCity) {
        var visit = visited[trip.cityId];
        var doneCount = visit ? visit.doneSpots.length : 0;
        tripBanner = '' +
          '<div class="trip-banner">' +
          '<div class="info">🎒 进行中的旅程：<strong>' + esc(tripCity.name) + '</strong> · 已打卡 ' + doneCount + '/' + tripCity.spots.length + ' 站</div>' +
          '<button class="crayon-btn small fresh" id="btn-continue-trip">继续旅程</button>' +
          '</div>';
      }
    }

    // 城市图鉴卡片：纯展示样式（无 hover 上浮、无手型），已游览盖章 + 明确的"看足迹"文字入口
    var cards = D.CITIES.map(function (c) {
      var isV = visitedIds.indexOf(c.id) !== -1;
      return '' +
        '<div class="city-card ' + (isV ? 'visited' : 'unvisited') + '" data-city="' + c.id + '">' +
        (isV ? '<span class="stamp">已打卡</span>' : '') +
        '<div class="city-glyph" style="background:' + (isV ? c.color : '#c9c2b4') + '">' + esc(c.name[0]) + '</div>' +
        '<div class="cname">' + esc(c.name) + '</div>' +
        '<div class="cslogan">' + esc(isV ? c.slogan : '待探索') + '</div>' +
        (isV ? '<span class="goto-foot" data-goto="' + c.id + '">看足迹 →</span>' : '') +
        '</div>';
    }).join('');

    mount(el, '' +
      '<h2 class="view-title">城市推荐</h2>' +
      '<p class="view-subtitle">回答五个小问题，让此刻的心情替你选一座城' + (llmOn ? '' : '（当前未配置大模型，将使用内置推荐逻辑）') + '</p>' +
      tripBanner +
      '<div class="recommend-hero">' +
      '<div class="grow">探索进度：已点亮 <strong style="color:var(--crayon-red);font-family:var(--font-hand);font-size:1.4rem">' + visitedIds.length + '</strong> / ' + D.CITIES.length + ' 座城市</div>' +
      '<button class="crayon-btn primary" id="btn-quiz">✦ 开始新一轮探索</button>' +
      '</div>' +
      '<div class="gallery-head">' +
      '<h3 class="gallery-title">🏙 城市图鉴</h3>' +
      '<p class="gallery-note">游览完成的城市会盖上印章，此处仅作收集展示</p>' +
      '</div>' +
      '<div class="city-grid">' + cards + '</div>');

    el.querySelector('#btn-quiz').addEventListener('click', function () { go('/recommend/quiz'); });
    var contBtn = el.querySelector('#btn-continue-trip');
    if (contBtn) {
      contBtn.addEventListener('click', function () {
        var t = S.getTrip();
        if (t) go('/spot/' + (t.currentIndex || 0));
      });
    }
    // 已游览城市的"看足迹"文字链 → 跳到足迹页对应城市
    el.querySelectorAll('.goto-foot').forEach(function (link) {
      link.addEventListener('click', function () {
        global.AppState.footCity = link.getAttribute('data-goto');
        go('/footprint');
      });
    });
  }

  /* ================= 3. 关键词选择流程 ================= */

  function renderQuiz(el) {
    var st = global.AppState.quiz;
    if (!st) { st = global.AppState.quiz = { step: 0, answers: {} }; }
    var stepDef = D.QUIZ_STEPS[st.step];
    var total = D.QUIZ_STEPS.length;
    var picked = st.answers[stepDef.key];

    // 步骤指示器
    var progress = D.QUIZ_STEPS.map(function (s, i) {
      var cls = i < st.step ? 'done' : (i === st.step ? 'now' : '');
      var inner = i < st.step ? '✓' : (i + 1);
      return '<div class="pstep ' + cls + '">' + inner + '</div>' + (i < total - 1 ? '<div class="pline"></div>' : '');
    }).join('');

    var stickers = stepDef.options.map(function (opt) {
      return '<div class="keyword-sticker' + (picked === opt ? ' picked' : '') + '" data-opt="' + esc(opt) + '">' + esc(opt) + '</div>';
    }).join('');

    mount(el, '' +
      '<div class="quiz-progress">' + progress + '</div>' +
      '<h2 class="quiz-question">' + esc(stepDef.title) + '</h2>' +
      '<p class="quiz-tip">' + esc(stepDef.subtitle) + '</p>' +
      '<div class="keyword-zone">' + stickers + '</div>' +
      '<div class="quiz-actions">' +
      (st.step > 0 ? '<button class="crayon-btn ghost" id="btn-prev">← 上一步</button>' : '') +
      '<button class="crayon-btn primary" id="btn-next" disabled>' + (st.step === total - 1 ? '✦ 为我推荐城市' : '下一步 →') + '</button>' +
      '</div>');

    // 贴纸单选
    el.querySelectorAll('.keyword-sticker').forEach(function (stEl) {
      stEl.addEventListener('click', function () {
        st.answers[stepDef.key] = stEl.getAttribute('data-opt');
        el.querySelectorAll('.keyword-sticker').forEach(function (x) { x.classList.remove('picked'); });
        stEl.classList.add('picked');
        el.querySelector('#btn-next').disabled = false;
      });
    });

    var prevBtn = el.querySelector('#btn-prev');
    if (prevBtn) prevBtn.addEventListener('click', function () { st.step--; renderQuiz(el); });

    el.querySelector('#btn-next').addEventListener('click', function () {
      if (st.step < total - 1) {
        st.step++;
        renderQuiz(el);
      } else {
        submitQuiz(el, st.answers);
      }
    });
  }

  /** 提交关键词 → 大模型/本地推荐 */
  function submitQuiz(el, answers) {
    console.log('[CityWalk] 提交关键词:', answers);
    mount(el, '' +
      '<div class="thinking-box">' +
      '<span class="pencil">✏️</span>' +
      '<p>正在对着地图翻找适合你的城市…</p>' +
      '</div>');

    L.recommendCity(answers).then(function (res) {
      console.log('[CityWalk] 推荐结果 city=' + res.cityId + ' source=' + res.source);
      global.AppState.result = { cityId: res.cityId, reason: res.reason, source: res.source };
      global.AppState.quiz = null; // 清空本次选择
      go('/recommend/result');
    });
  }

  /* ================= 4. 推荐结果页 ================= */

  function renderResult(el) {
    var res = global.AppState.result;
    if (!res || !D.getCity(res.cityId)) { go('/recommend/quiz'); return; }
    var city = D.getCity(res.cityId);
    var visited = S.getCityVisit(city.id);

    var spotRows = city.spots.map(function (s, i) {
      return '' +
        '<div class="spot-row">' +
        '<div class="num">' + (i + 1) + '</div>' +
        '<div><div class="sname">' + esc(s.name) + '</div><div class="sshort">' + esc(s.short) + '</div></div>' +
        '</div>';
    }).join('');

    mount(el, '' +
      '<h2 class="view-title">为你选好了</h2>' +
      '<p class="view-subtitle">缘分到了，就是这座城</p>' +
      '<div class="result-layout">' +
      '<div class="paper-card taped">' +
      '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
      '<span class="result-city-name" style="color:' + city.color + '">' + esc(city.name) + '</span>' +
      (visited ? '<span class="stamp">已打卡</span>' : '') +
      '</div>' +
      '<p style="color:var(--ink-light);margin-top:6px">' + esc(city.slogan) + '</p>' +
      '<p class="result-reason">' + esc(res.reason) + '</p>' +
      '<span class="result-source">' + (res.source === 'ai' ? '🤖 大模型推荐' : '📒 内置推荐（配置大模型后可获得 AI 解读）') + '</span>' +
      '<div id="city-brief-zone"></div>' +
      '<h3 style="font-family:var(--font-hand);font-size:1.3rem;margin:14px 0 4px">热门打卡路线</h3>' +
      '<div class="spot-list">' + spotRows + '</div>' +
      '<div class="result-actions">' +
      '<button class="crayon-btn primary" id="btn-begin-trip">🎒 开始旅程</button>' +
      '<button class="crayon-btn ghost" id="btn-repick">换一个</button>' +
      '</div>' +
      '</div>' +
      '<div class="paper-card">' +
      '<h3 style="font-family:var(--font-hand);font-size:1.25rem;margin-bottom:10px;text-align:center">路线速览</h3>' +
      M.renderRouteMini(city) +
      '<p style="text-align:center;color:var(--ink-light);font-size:0.95rem;margin-top:8px">按编号顺序游览，路线已按顺路原则规划</p>' +
      '</div>' +
      '</div>');

    // 异步加载城市概览（AI 或预设），不阻塞首屏
    L.cityBrief(city).then(function (brief) {
      var zone = el.querySelector('#city-brief-zone');
      if (zone && brief && brief.routeTip) {
        zone.innerHTML = '<p style="color:var(--ink-light);font-size:0.98rem;border-left:4px solid ' + city.color + ';padding-left:12px;margin-bottom:6px">💡 ' + esc(brief.routeTip) + '</p>';
      }
    });

    el.querySelector('#btn-begin-trip').addEventListener('click', function () {
      S.saveTrip({ cityId: city.id, currentIndex: 0, startedAt: Date.now() });
      console.log('[CityWalk] 开始旅程 city=' + city.id);
      go('/spot/0');
    });
    el.querySelector('#btn-repick').addEventListener('click', function () {
      global.AppState.result = null;
      go('/recommend/quiz');
    });
  }

  /* ================= 5. 打卡点详情页 ================= */

  function renderSpot(el, indexStr) {
    var trip = S.getTrip();
    if (!trip) { go('/recommend'); return; }
    var city = D.getCity(trip.cityId);
    var idx = parseInt(indexStr, 10) || 0;
    if (!city || idx < 0 || idx >= city.spots.length) { go('/recommend'); return; }

    // 同步行程进度
    trip.currentIndex = idx;
    S.saveTrip(trip);

    var spot = city.spots[idx];
    var visit = S.getCityVisit(city.id);
    var done = visit && visit.doneSpots.indexOf(spot.id) !== -1;
    var hasNote = S.hasNoteForSpot(city.id, spot.id);
    var isLast = idx === city.spots.length - 1;

    mount(el, '' +
      '<div class="spot-header">' +
      '<span class="spot-progress-tag">第 ' + (idx + 1) + ' / ' + city.spots.length + ' 站</span>' +
      '<h2 class="view-title" style="margin-bottom:0">' + esc(spot.name) + '</h2>' +
      (done ? '<span class="stamp">已打卡</span>' : '') +
      '</div>' +
      '<p class="view-subtitle">' + esc(city.name) + ' · ' + esc(spot.short) + '</p>' +
      '<div class="spot-layout">' +
      // 左栏：指南内容（AI/预设异步填充）
      '<div class="paper-card taped" id="guide-card">' +
      '<div class="guide-block"><div class="gtitle"><span class="dot" style="background:var(--crayon-blue)"></span>打卡点介绍</div><p class="gtext" data-f="intro">' + esc(spot.intro) + '</p></div>' +
      '<div class="guide-block"><div class="gtitle"><span class="dot" style="background:var(--crayon-red)"></span>注意事项</div><p class="gtext" data-f="tips">' + esc(spot.tips) + '</p></div>' +
      '<div class="guide-block"><div class="gtitle"><span class="dot" style="background:var(--crayon-green)"></span>路线与交通</div><p class="gtext" data-f="transport">' + esc(spot.transport) + '</p></div>' +
      '<div class="guide-block"><div class="gtitle"><span class="dot" style="background:var(--crayon-purple)"></span>私藏建议</div><p class="gtext" data-f="extra">' + esc(spot.extra) + '</p></div>' +
      '<span class="result-source" id="guide-source">加载中…</span>' +
      '</div>' +
      // 右栏：城市地图 + 操作
      '<div class="spot-side">' +
      '<div class="paper-card">' + M.renderCityMap(city, { doneSpots: visit ? visit.doneSpots : [], highlightIndex: idx }) +
      '<p class="map-caption">橙色为待打卡，绿色为已完成</p></div>' +
      '<div class="paper-card">' +
      '<h3 style="font-family:var(--font-hand);font-size:1.25rem;margin-bottom:12px">到此一游？</h3>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
      (done
        ? '<button class="crayon-btn small" id="btn-note">' + (hasNote ? '✎ 再写一张便签' : '✎ 补写便签') + '</button>'
        : '<button class="crayon-btn small fresh" id="btn-done">✓ 完成打卡</button>' +
          '<button class="crayon-btn small primary" id="btn-done-note">📸 打卡并写便签</button>') +
      '</div>' +
      '<div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap">' +
      (idx > 0 ? '<button class="crayon-btn small ghost" id="btn-prev-spot">← 上一站</button>' : '') +
      (!isLast ? '<button class="crayon-btn small ghost" id="btn-next-spot">下一站 →</button>' : '') +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>');

    // 异步刷新指南（大模型覆盖预设）
    L.spotGuide(city.name, spot).then(function (g) {
      var card = el.querySelector('#guide-card');
      if (!card) return;
      card.querySelector('[data-f="intro"]').textContent = g.intro;
      card.querySelector('[data-f="tips"]').textContent = g.tips;
      card.querySelector('[data-f="transport"]').textContent = g.transport;
      card.querySelector('[data-f="extra"]').textContent = g.extra;
      var src = card.querySelector('#guide-source');
      src.textContent = g.source === 'ai' ? '🤖 内容来自大模型' : '📒 内置内容（配置大模型后可获得 AI 实时解读）';
    });

    /** 打卡完成后的流转：最后一站 → 旅程完成；否则提示前往下一站 */
    function afterDone() {
      if (isLast) {
        S.clearTrip();
        toast('🎉 ' + city.name + '全部打卡完成！去足迹页看看吧', 3000);
        console.log('[CityWalk] 城市旅程完成 city=' + city.id);
        global.AppState.footCity = city.id;
        go('/footprint');
      } else {
        toast('打卡成功！下一站：' + city.spots[idx + 1].name);
        go('/spot/' + (idx + 1));
      }
    }

    var btnDone = el.querySelector('#btn-done');
    if (btnDone) btnDone.addEventListener('click', function () { S.markSpotDone(city.id, spot.id); afterDone(); });

    var btnDoneNote = el.querySelector('#btn-done-note');
    if (btnDoneNote) btnDoneNote.addEventListener('click', function () {
      S.markSpotDone(city.id, spot.id);
      openNoteEditor({ cityId: city.id, spotId: spot.id }, afterDone);
    });

    var btnNote = el.querySelector('#btn-note');
    if (btnNote) btnNote.addEventListener('click', function () {
      openNoteEditor({ cityId: city.id, spotId: spot.id }, function () { renderSpot(el, indexStr); });
    });

    var prev = el.querySelector('#btn-prev-spot');
    if (prev) prev.addEventListener('click', function () { go('/spot/' + (idx - 1)); });
    var next = el.querySelector('#btn-next-spot');
    if (next) next.addEventListener('click', function () { go('/spot/' + (idx + 1)); });
  }

  /* ================= 便签编辑器（弹层组件） ================= */

  /**
   * 打开便签编辑器
   * @param {Object} opts { cityId, spotId, note? } note 存在则为编辑模式
   * @param {Function} onSaved 保存成功回调
   */
  function openNoteEditor(opts, onSaved) {
    var root = document.getElementById('modal-root');
    var city = D.getCity(opts.cityId);
    var spot = D.getSpot(opts.cityId, opts.spotId);
    var editing = opts.note || null;

    // 编辑器内临时状态：文本、图片、颜色、润色前原文
    var draft = {
      text: editing ? editing.text : '',
      img: editing ? editing.img : '',
      color: editing ? editing.color : D.NOTE_COLORS[0],
      originalText: null
    };

    var colorDots = D.NOTE_COLORS.map(function (c) {
      return '<div class="color-dot' + (draft.color === c ? ' picked' : '') + '" data-color="' + c + '" style="background:' + c + '"></div>';
    }).join('');

    root.innerHTML = '' +
      '<div class="modal-mask">' +
      '<div class="note-editor">' +
      '<h3>' + (editing ? '编辑便签' : '写张便签') + '</h3>' +
      '<p class="editor-for">📍 ' + esc(city.name) + ' · ' + esc(spot.name) + '</p>' +
      '<textarea id="ne-text" placeholder="随手记下此刻：看到的、吃到的、想到的…">' + esc(draft.text) + '</textarea>' +
      '<div class="img-drop" id="ne-img" title="点击上传照片">' +
      (draft.img ? '<img src="' + draft.img + '"><span class="reupload">点击换图</span>' : '<span>📷 点击上传照片（自动压缩）</span>') +
      '<input type="file" accept="image/*" id="ne-file" style="display:none">' +
      '</div>' +
      '<div class="color-row">' + colorDots + '</div>' +
      '<div class="editor-actions">' +
      '<button class="crayon-btn small cool" id="ne-polish" title="由大模型润色文案">✨ AI 润色</button>' +
      '<button class="crayon-btn small ghost hidden" id="ne-undo">撤销润色</button>' +
      '<span class="spacer"></span>' +
      '<button class="crayon-btn small ghost" id="ne-cancel">取消</button>' +
      '<button class="crayon-btn small primary" id="ne-save">贴上便签墙 📌</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    var mask = root.querySelector('.modal-mask');
    var textarea = root.querySelector('#ne-text');
    var imgDrop = root.querySelector('#ne-img');
    var fileInput = root.querySelector('#ne-file');
    var polishBtn = root.querySelector('#ne-polish');
    var undoBtn = root.querySelector('#ne-undo');

    function close() { root.innerHTML = ''; }
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    root.querySelector('#ne-cancel').addEventListener('click', close);

    textarea.addEventListener('input', function () { draft.text = textarea.value; });

    // 颜色选择
    root.querySelectorAll('.color-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        draft.color = dot.getAttribute('data-color');
        root.querySelectorAll('.color-dot').forEach(function (x) { x.classList.remove('picked'); });
        dot.classList.add('picked');
      });
    });

    // 图片上传 → canvas 压缩为 base64（最长边 800px，控制 localStorage 体积）
    imgDrop.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      console.log('[CityWalk] 选择图片 ' + file.name + ' 原始大小=' + Math.round(file.size / 1024) + 'KB');
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var max = 800;
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          draft.img = canvas.toDataURL('image/jpeg', 0.75);
          console.log('[CityWalk] 图片压缩完成 base64 大小=' + Math.round(draft.img.length / 1024) + 'KB');
          imgDrop.innerHTML = '<img src="' + draft.img + '"><span class="reupload">点击换图</span>';
          imgDrop.appendChild(fileInput);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    // AI 润色（记录原文支持撤销）
    polishBtn.addEventListener('click', function () {
      var text = textarea.value.trim();
      if (!text) { toast('先写点内容再润色吧'); return; }
      if (!L.isConfigured()) { toast('请先在设置中配置大模型'); go('/settings'); close(); return; }
      draft.originalText = text;
      polishBtn.disabled = true;
      polishBtn.textContent = '✨ 润色中…';
      L.polishNote(text).then(function (polished) {
        polishBtn.disabled = false;
        polishBtn.textContent = '✨ AI 润色';
        if (polished && polished !== text) {
          textarea.value = polished;
          draft.text = polished;
          undoBtn.classList.remove('hidden');
          toast('润色完成，不满意可撤销');
        } else {
          toast('润色结果与原文一致');
        }
      });
    });

    undoBtn.addEventListener('click', function () {
      if (draft.originalText != null) {
        textarea.value = draft.originalText;
        draft.text = draft.originalText;
        draft.originalText = null;
        undoBtn.classList.add('hidden');
      }
    });

    // 保存
    root.querySelector('#ne-save').addEventListener('click', function () {
      var text = textarea.value.trim();
      if (!text && !draft.img) { toast('便签不能为空，写点文字或贴张照片吧'); return; }

      if (editing) {
        var okU = S.updateNote(editing.id, { text: text, img: draft.img, color: draft.color, polished: draft.originalText != null || editing.polished });
        if (!okU) { toast('保存失败：本地存储空间不足，试试更小的图片', 3000); return; }
      } else {
        // 新便签：x/y=-1 为"待布局"标记，便签墙渲染时自动扫描找空位，避免覆盖已有便签
        var saved = S.addNote({
          cityId: opts.cityId,
          spotId: opts.spotId,
          text: text,
          img: draft.img,
          color: draft.color,
          x: -1,
          y: -1,
          rotate: (Math.random() * 8 - 4).toFixed(1),
          polished: draft.originalText != null
        });
        if (!saved) { toast('保存失败：本地存储空间不足，试试更小的图片', 3000); return; }
      }
      close();
      toast('📌 已贴上便签墙');
      if (typeof onSaved === 'function') onSaved();
    });
  }

  /* ================= 6. 便签墙 ================= */

  /** 便签占位估算尺寸（找空位/紧凑网格共用） */
  var NOTE_CELL_W = 240;
  var NOTE_CELL_H = 220;

  /**
   * 为新便签（x<0 待布局标记）分配空位：
   * 网格扫描已有便签占用的格子，新便签优先落入空闲格；格子用尽才随机（允许覆盖）
   */
  function assignFreeSlots(notes, boardEl) {
    var bw = boardEl.clientWidth, bh = boardEl.clientHeight;
    if (!bw || !bh) return;
    var cols = Math.max(1, Math.floor(bw / NOTE_CELL_W));
    var rows = Math.max(1, Math.floor(bh / NOTE_CELL_H));
    var occupied = {};
    notes.forEach(function (n) {
      if (n.x >= 0) {
        var idx = Math.floor((n.y / 100 * bh) / NOTE_CELL_H) * cols + Math.floor((n.x / 100 * bw) / NOTE_CELL_W);
        occupied[idx] = true;
      }
    });
    notes.forEach(function (n) {
      if (n.x < 0) {
        var free = [];
        for (var i = 0; i < cols * rows; i++) { if (!occupied[i]) free.push(i); }
        if (free.length) {
          var slot = free[Math.floor(Math.random() * free.length)];
          occupied[slot] = true;
          var col = slot % cols, row = Math.floor(slot / cols);
          n.x = (col * NOTE_CELL_W + 8 + Math.random() * 20) / bw * 100;
          n.y = (row * NOTE_CELL_H + 8 + Math.random() * 24) / bh * 100;
        } else {
          // 没空间了：随机位置，允许覆盖
          n.x = 5 + Math.random() * 60;
          n.y = 5 + Math.random() * 50;
        }
        S.updateNote(n.id, { x: n.x, y: n.y });
        console.log('[CityWalk] 便签自动落位 id=' + n.id + ' → (' + n.x.toFixed(1) + '%, ' + n.y.toFixed(1) + '%)');
      }
    });
  }

  function renderNotes(el) {
    var notes = S.getNotes();
    var visited = S.getVisited();

    // 筛选状态（内存态，切页后保留）
    var filter = global.AppState.noteFilter || { city: 'all', type: 'all' };
    global.AppState.noteFilter = filter;

    // 已打卡但未写便签的打卡点 → 顶部待补区，支持旅行结束后一次性补贴
    var pending = [];
    Object.keys(visited).forEach(function (cityId) {
      var city = D.getCity(cityId);
      if (!city) return;
      visited[cityId].doneSpots.forEach(function (spotId) {
        if (!S.hasNoteForSpot(cityId, spotId)) {
          pending.push({ cityId: cityId, spotId: spotId, label: city.name + ' · ' + (D.getSpot(cityId, spotId) || {}).name });
        }
      });
    });

    var pendingHtml = pending.length
      ? '<div class="pending-strip">' + pending.map(function (p, i) {
          return '<span class="pending-chip" data-idx="' + i + '">✎ 补一张：' + esc(p.label) + '</span>';
        }).join('') + '</div>'
      : '';

    // 筛选 chips：城市只列出出现过便签的；类型分 全部/含照片/纯文字
    var noteCityIds = [];
    notes.forEach(function (n) { if (noteCityIds.indexOf(n.cityId) === -1) noteCityIds.push(n.cityId); });
    var cityChips = '<span class="filter-chip' + (filter.city === 'all' ? ' on' : '') + '" data-fcity="all">全部城市</span>' +
      noteCityIds.map(function (id) {
        var c = D.getCity(id);
        return '<span class="filter-chip' + (filter.city === id ? ' on' : '') + '" data-fcity="' + id + '">' + esc(c ? c.name : id) + '</span>';
      }).join('');
    var typeChips = [['all', '全部'], ['img', '含照片'], ['text', '纯文字']].map(function (t) {
      return '<span class="filter-chip' + (filter.type === t[0] ? ' on' : '') + '" data-ftype="' + t[0] + '">' + t[1] + '</span>';
    }).join('');

    var filtering = filter.city !== 'all' || filter.type !== 'all';

    mount(el, '' +
      '<h2 class="view-title">便签墙</h2>' +
      '<p class="view-subtitle">每一张便签，都是一小段旅途记忆</p>' +
      '<div class="notes-toolbar">' +
      '<span class="hint">🖐 ' + (filtering ? '筛选视图下便签按网格排列，切回「全部」恢复自由摆放' : '便签可以自由拖动摆放 · 悬停可编辑或删除') + '</span>' +
      '</div>' +
      (notes.length ? '<div class="filter-bar"><span class="filter-label">筛选</span>' + cityChips + '<span class="filter-sep"></span>' + typeChips + '</div>' : '') +
      pendingHtml +
      '<div class="cork-board" id="board">' +
      (notes.length ? '' : '<div class="cork-empty"><div class="big">软木板还空着</div><div>完成一次打卡后，来贴下第一张便签吧</div></div>') +
      '</div>');

    var board = el.querySelector('#board');

    // 待补 chips
    el.querySelectorAll('.pending-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var p = pending[parseInt(chip.getAttribute('data-idx'), 10)];
        openNoteEditor({ cityId: p.cityId, spotId: p.spotId }, function () { renderNotes(el); });
      });
    });

    // 新便签（x<0）自动找空位，避免覆盖已有便签
    assignFreeSlots(notes, board);

    // 渲染便签
    notes.forEach(function (n) {
      var city = D.getCity(n.cityId);
      var spot = D.getSpot(n.cityId, n.spotId);
      var noteEl = document.createElement('div');
      noteEl.className = 'sticky-note';
      noteEl.style.left = n.x + '%';
      noteEl.style.top = n.y + '%';
      noteEl.style.background = n.color;
      noteEl.style.transform = 'rotate(' + n.rotate + 'deg)';
      noteEl.setAttribute('data-id', n.id);
      noteEl._note = n; // 引用挂载，筛选动画时免查找
      noteEl.innerHTML = '' +
        '<div class="note-ops">' +
        '<button data-op="polish" title="AI 润色">✨</button>' +
        '<button data-op="edit" title="编辑">✎</button>' +
        '<button data-op="del" title="撕掉">✕</button>' +
        '</div>' +
        (n.img ? '<img class="note-img" src="' + n.img + '">' : '') +
        '<div class="note-text">' + esc(n.text) + '</div>' +
        (n.polished ? '<span class="polished-tag">AI 润色</span>' : '') +
        '<div class="note-meta"><span>' + esc(city ? city.name : '') + ' · ' + esc(spot ? spot.name : '') + '</span><span>' + fmtTime(n.createdAt).slice(5) + '</span></div>';
      board.appendChild(noteEl);
      bindNoteInteractions(noteEl, n, el, function () { return isFiltering(); });
    });

    /** 当前是否处于筛选视图 */
    function isFiltering() {
      return filter.city !== 'all' || filter.type !== 'all';
    }

    function matches(n) {
      if (filter.city !== 'all' && n.cityId !== filter.city) return false;
      if (filter.type === 'img' && !n.img) return false;
      if (filter.type === 'text' && n.img) return false;
      return true;
    }

    /**
     * 应用筛选（FLIP 重排动画）：
     * 符合的便签平移到紧凑网格（仅视图层 transform，不改动存储位置）；
     * 不符合的淡出隐藏；切回「全部」时各自飞回存储位置
     */
    function applyFilter(animate) {
      var bw = board.clientWidth, bh = board.clientHeight;
      var filteringNow = isFiltering();
      var visible = notes.filter(matches);
      var cols = Math.max(1, Math.floor(bw / NOTE_CELL_W));
      var targets = {};
      visible.forEach(function (n, i) {
        var col = i % cols, row = Math.floor(i / cols);
        targets[n.id] = { x: col * NOTE_CELL_W + 10, y: row * NOTE_CELL_H + 10 };
      });

      board.querySelectorAll('.sticky-note').forEach(function (noteEl) {
        var n = noteEl._note;
        if (!n) return;
        // 动画/无动画切换：过渡类由 CSS transition 承担，拖动时 dragging 类会禁用
        if (!animate) noteEl.classList.add('no-anim');
        if (targets[n.id]) {
          noteEl.style.display = '';
          // 强制 reflow 后再变 opacity，保证隐藏→显示的淡入生效
          void noteEl.offsetWidth;
          noteEl.style.opacity = '1';
          noteEl.style.pointerEvents = '';
          if (filteringNow) {
            var t = targets[n.id];
            var dx = t.x - (n.x / 100 * bw);
            var dy = t.y - (n.y / 100 * bh);
            noteEl.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) rotate(0deg)';
            noteEl.style.cursor = 'default';
          } else {
            noteEl.style.transform = 'rotate(' + n.rotate + 'deg)';
            noteEl.style.cursor = 'grab';
          }
        } else {
          noteEl.style.opacity = '0';
          noteEl.style.pointerEvents = 'none';
          if (animate) {
            (function (target) {
              setTimeout(function () {
                if (!matches(target._note)) target.style.display = 'none';
              }, 320);
            })(noteEl);
          } else {
            noteEl.style.display = 'none';
          }
        }
        if (!animate) {
          // 下一帧恢复动画，避免影响后续交互
          (function (target) {
            requestAnimationFrame(function () { target.classList.remove('no-anim'); });
          })(noteEl);
        }
      });
    }

    // 筛选 chips 绑定
    el.querySelectorAll('[data-fcity]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filter.city = chip.getAttribute('data-fcity');
        el.querySelectorAll('[data-fcity]').forEach(function (x) { x.classList.toggle('on', x === chip); });
        applyFilter(true);
      });
    });
    el.querySelectorAll('[data-ftype]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filter.type = chip.getAttribute('data-ftype');
        el.querySelectorAll('[data-ftype]').forEach(function (x) { x.classList.toggle('on', x === chip); });
        applyFilter(true);
      });
    });

    // 首次进入若带筛选状态，直接应用（无动画）
    if (isFiltering()) applyFilter(false);
  }

  /** 便签拖动 + 操作按钮绑定（isFiltering 为函数，筛选视图下禁止拖动） */
  function bindNoteInteractions(noteEl, note, viewEl, isFiltering) {
    var board = noteEl.parentElement;
    var dragging = false, moved = false, offsetX = 0, offsetY = 0;

    noteEl.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.note-ops')) return; // 点操作按钮不进入拖动
      if (isFiltering && isFiltering()) return; // 筛选视图为临时排列，拖动无意义
      dragging = true;
      moved = false;
      noteEl.classList.add('dragging');
      noteEl.setPointerCapture(e.pointerId);
      var rect = noteEl.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
    });

    noteEl.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      moved = true;
      var bRect = board.getBoundingClientRect();
      // 以百分比记录位置，窗口缩放时便签相对位置不变
      var x = ((e.clientX - bRect.left - offsetX) / bRect.width) * 100;
      var y = ((e.clientY - bRect.top - offsetY) / bRect.height) * 100;
      // 限制在板内
      x = Math.max(-2, Math.min(88, x));
      y = Math.max(-2, Math.min(85, y));
      noteEl.style.left = x + '%';
      noteEl.style.top = y + '%';
      noteEl.style.transform = 'rotate(0deg)';
      note._x = x; note._y = y;
    });

    noteEl.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      noteEl.classList.remove('dragging');
      if (moved && note._x != null) {
        S.updateNote(note.id, { x: note._x, y: note._y, rotate: note.rotate });
      }
    });

    // 操作按钮
    noteEl.querySelectorAll('.note-ops button').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var op = btn.getAttribute('data-op');
        if (op === 'del') {
          S.deleteNote(note.id);
          noteEl.remove();
          toast('便签已撕掉');
        } else if (op === 'edit') {
          openNoteEditor({ cityId: note.cityId, spotId: note.spotId, note: note }, function () { renderNotes(viewEl); });
        } else if (op === 'polish') {
          if (!L.isConfigured()) { toast('请先在设置中配置大模型'); go('/settings'); return; }
          if (!note.text) { toast('这张便签没有文字内容'); return; }
          btn.textContent = '…';
          L.polishNote(note.text).then(function (polished) {
            if (polished && polished !== note.text) {
              S.updateNote(note.id, { text: polished, polished: true });
              toast('润色完成');
              renderNotes(viewEl);
            } else {
              btn.textContent = '✨';
              toast('润色结果与原文一致');
            }
          });
        }
      });
    });
  }

  /* ================= 7. 足迹 ================= */

  function renderFootprint(el) {
    var visited = S.getVisited();
    var visitedIds = Object.keys(visited);

    if (!visitedIds.length) {
      mount(el, '' +
        '<h2 class="view-title">足迹</h2>' +
        '<p class="view-subtitle">走过的路，都会在这里连成线</p>' +
        '<div class="empty-box"><div class="big">还没有游览记录</div><div>从一次城市推荐开始你的第一段旅程吧</div>' +
        '<button class="crayon-btn primary" id="btn-go-quiz">✦ 开始探索</button></div>');
      el.querySelector('#btn-go-quiz').addEventListener('click', function () { go('/recommend/quiz'); });
      return;
    }

    // 视图模式：city=城市地图 / china=全国大盘；默认城市取指定或最近游览
    var st = global.AppState;
    var mode = st.footMode || 'city';
    var currentCityId = st.footCity && visited[st.footCity] ? st.footCity : visitedIds[visitedIds.length - 1];

    // 统计
    var totalSpots = visitedIds.reduce(function (sum, id) { return sum + (visited[id].doneSpots || []).length; }, 0);

    // 城市切换器
    var switcher = visitedIds.map(function (id) {
      var c = D.getCity(id);
      return c ? '<button class="city-switch-btn' + (mode === 'city' && id === currentCityId ? ' on' : '') + '" data-city="' + id + '">' + esc(c.name) + '</button>' : '';
    }).join('');

    var mapHtml, caption;
    if (mode === 'china') {
      mapHtml = M.renderChinaMap(D.CITIES, visitedIds);
      caption = '全国游览大盘 · 红点为已打卡城市（点击可查看详情）';
    } else {
      var city = D.getCity(currentCityId);
      mapHtml = M.renderCityMap(city, { doneSpots: visited[currentCityId].doneSpots });
      var v = visited[currentCityId];
      caption = esc(city.name) + ' · 打卡 ' + v.doneSpots.length + '/' + city.spots.length + ' 站 · ' + fmtTime(v.visitedAt).slice(0, 10);
    }

    mount(el, '' +
      '<h2 class="view-title">足迹</h2>' +
      '<p class="view-subtitle">走过的城市与路线，都值得收藏</p>' +
      '<div class="foot-stats">' +
      '<div class="stat-item"><div class="num">' + visitedIds.length + '</div><div class="lbl">游览城市</div></div>' +
      '<div class="stat-item"><div class="num">' + totalSpots + '</div><div class="lbl">打卡景点</div></div>' +
      '<div class="stat-item"><div class="num">' + S.getNotes().length + '</div><div class="lbl">便签</div></div>' +
      '</div>' +
      '<div class="foot-toolbar">' +
      '<div class="city-switcher">' + switcher + '</div>' +
      '<span class="spacer"></span>' +
      '<button class="crayon-btn small ' + (mode === 'china' ? 'fresh' : 'cool') + '" id="btn-toggle-map">' + (mode === 'china' ? '🏙 看城市路线' : '🗺 全国大盘') + '</button>' +
      '</div>' +
      '<div class="map-frame">' + mapHtml + '<p class="map-caption">' + caption + '</p></div>');

    el.querySelectorAll('.city-switch-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        st.footMode = 'city';
        st.footCity = btn.getAttribute('data-city');
        renderFootprint(el);
      });
    });

    el.querySelector('#btn-toggle-map').addEventListener('click', function () {
      st.footMode = mode === 'china' ? 'city' : 'china';
      renderFootprint(el);
    });

    // 全国大盘点击已游览城市 → 切到该城市路线
    if (mode === 'china') {
      el.querySelectorAll('.map-city.visited').forEach(function (g) {
        g.addEventListener('click', function () {
          st.footMode = 'city';
          st.footCity = g.getAttribute('data-city');
          renderFootprint(el);
        });
      });
    }
  }

  /* ================= 8. 设置页 ================= */

  function renderSettings(el) {
    var s = S.getSettings();
    var llm = s.llm || {};
    var configured = L.isConfigured();
    var providers = D.LLM_PROVIDERS;
    // 根据已保存的 baseUrl 反推服务商，未匹配则视为自定义
    var currentProvider = providers.find(function (p) { return p.baseUrl && p.baseUrl === llm.baseUrl; }) ||
      providers.find(function (p) { return p.id === 'custom'; });

    // 服务商选择卡片
    var providerCards = providers.map(function (p) {
      var on = currentProvider && currentProvider.id === p.id;
      return '<div class="provider-card' + (on ? ' on' : '') + '" data-pid="' + p.id + '">' +
        '<div class="pname">' + esc(p.name) + '</div>' +
        '<div class="phint">' + esc(p.keyHint) + '</div>' +
        '</div>';
    }).join('');

    // 模型字段：预设服务商 → 下拉；自定义 → 输入框
    var isCustom = currentProvider && currentProvider.id === 'custom';
    var modelField = isCustom
      ? '<input id="set-model" type="text" value="' + esc(llm.model || '') + '" placeholder="如 gpt-4o-mini">'
      : '<select id="set-model">' + currentProvider.models.map(function (m) {
          return '<option value="' + m + '"' + (llm.model === m ? ' selected' : '') + '>' + m + '</option>';
        }).join('') + '</select>';

    mount(el, '' +
      '<h2 class="view-title">设置</h2>' +
      '<p class="view-subtitle">配置大模型后，推荐、指南与润色都将由 AI 驱动</p>' +
      '<div class="paper-card taped settings-card">' +
      '<span class="llm-status ' + (configured ? 'on' : 'off') + '"><span class="dot"></span>' + (configured ? '大模型已接入' : '未配置大模型 · 当前使用内置内容') + '</span>' +
      '<div class="form-row"><label>服务商 <span class="req">*</span></label>' +
      '<div class="provider-row">' + providerCards + '</div></div>' +
      '<div class="form-row"><label>API 地址 <span class="req">*</span></label>' +
      '<input id="set-base" type="text" value="' + esc(llm.baseUrl || '') + '" placeholder="选择服务商后自动填充"' + (isCustom ? '' : ' readonly') + '></div>' +
      '<div class="form-row"><label>模型 <span class="req">*</span></label>' + modelField + '</div>' +
      '<div class="form-row"><label>API Key <span class="req">*</span></label>' +
      '<input id="set-key" type="password" value="' + esc(llm.apiKey || '') + '" placeholder="填入服务商平台的 API Key"></div>' +
      '<div class="settings-actions">' +
      '<button class="crayon-btn small primary" id="btn-save-settings">保存配置</button>' +
      '<button class="crayon-btn small cool" id="btn-test-llm">测试连接</button>' +
      '</div>' +
      '<div class="danger-zone">' +
      '<h3 style="font-family:var(--font-hand);margin-bottom:10px">数据管理</h3>' +
      '<p class="form-note" style="margin-bottom:12px">所有数据仅保存在本机浏览器 localStorage，清空后不可恢复。</p>' +
      '<button class="crayon-btn small ghost" id="btn-clear-all" style="border-color:var(--crayon-red);color:var(--crayon-red)">清空全部数据</button>' +
      '</div>' +
      '</div>');

    // 切换服务商：记录选择并重渲染（baseUrl 与模型选项随之更新），保留已填的 API Key
    el.querySelectorAll('.provider-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var p = providers.find(function (x) { return x.id === card.getAttribute('data-pid'); });
        var cur = S.getSettings();
        cur.llm = {
          providerId: p.id,
          baseUrl: p.baseUrl,
          apiKey: el.querySelector('#set-key').value.trim(), // 保留已输入的 Key
          model: p.models.length ? p.models[0] : ''
        };
        S.saveSettings(cur);
        renderSettings(el);
      });
    });

    function collect() {
      return {
        llm: {
          providerId: currentProvider ? currentProvider.id : 'custom',
          baseUrl: el.querySelector('#set-base').value.trim(),
          apiKey: el.querySelector('#set-key').value.trim(),
          model: el.querySelector('#set-model').value.trim()
        }
      };
    }

    el.querySelector('#btn-save-settings').addEventListener('click', function () {
      S.saveSettings(collect());
      console.log('[CityWalk] 设置已保存');
      toast('设置已保存');
      renderSettings(el);
    });

    el.querySelector('#btn-test-llm').addEventListener('click', function () {
      var btn = this;
      S.saveSettings(collect()); // 先保存再测
      btn.disabled = true;
      btn.textContent = '测试中…';
      L.testConnection().then(function () {
        toast('✅ 大模型连接成功');
      }).catch(function (e) {
        toast('❌ 连接失败：' + e.message, 3500);
      }).then(function () {
        btn.disabled = false;
        btn.textContent = '测试连接';
        renderSettings(el);
      });
    });

    el.querySelector('#btn-clear-all').addEventListener('click', function () {
      if (confirm('确定清空全部游览记录、便签与设置吗？此操作不可恢复。')) {
        S.clearAll();
        global.AppState = {};
        toast('已清空，重新开始吧');
        go('/welcome');
        location.reload();
      }
    });
  }

  /* ================= 导出 ================= */

  global.AppViews = {
    renderWelcome: renderWelcome,
    renderRecommend: renderRecommend,
    renderQuiz: renderQuiz,
    renderResult: renderResult,
    renderSpot: renderSpot,
    renderNotes: renderNotes,
    renderFootprint: renderFootprint,
    renderSettings: renderSettings,
    toast: toast
  };
})(window);
