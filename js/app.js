/**
 * app.js —— 路由与主控
 * hash 路由：#/welcome | #/recommend | #/recommend/quiz | #/recommend/result
 *           #/spot/:index | #/notes | #/footprint | #/settings
 */
(function (global) {
  'use strict';

  /** 全局内存态（不持久化）：选择流程进度、推荐结果、足迹页浏览状态 */
  global.AppState = {};

  var V = global.AppViews;
  var S = global.AppStore;

  /** 路由表：path → { render, tab }（tab 用于顶部导航高亮） */
  var ROUTES = {
    '/welcome': { render: V.renderWelcome, bare: true },
    '/recommend': { render: V.renderRecommend, tab: 'recommend' },
    '/recommend/quiz': { render: V.renderQuiz, tab: 'recommend' },
    '/recommend/result': { render: V.renderResult, tab: 'recommend' },
    '/spot': { render: V.renderSpot, tab: 'recommend' },
    '/notes': { render: V.renderNotes, tab: 'notes' },
    '/footprint': { render: V.renderFootprint, tab: 'footprint' },
    '/settings': { render: V.renderSettings }
  };

  /** 解析 hash：返回 { path, param }，如 #/spot/2 → { path:'/spot', param:'2' } */
  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '';
    var seg = raw.split('/').filter(Boolean); // ['spot','2']
    if (!seg.length) return { path: '', param: null };
    // 优先匹配两级路由（如 /recommend/quiz），否则匹配一级路由，剩余段作为参数（如 /spot/2 → param='2'）
    if (ROUTES['/' + seg[0] + '/' + seg[1]]) {
      return { path: '/' + seg[0] + '/' + seg[1], param: seg.slice(2).join('/') || null };
    }
    if (ROUTES['/' + seg[0]]) {
      return { path: '/' + seg[0], param: seg.slice(1).join('/') || null };
    }
    return { path: '', param: null };
  }

  /** 渲染当前路由对应视图 */
  function route() {
    var container = document.getElementById('view-container');
    var header = document.getElementById('app-header');
    var r = parseHash();

    // 默认路由：未看过引导 → welcome；否则 → 城市推荐
    if (!r.path) {
      location.replace(S.isOnboarded() ? '#/recommend' : '#/welcome');
      return;
    }

    var def = ROUTES[r.path];
    if (!def) { location.replace('#/recommend'); return; }

    // 引导页隐藏顶部导航
    header.classList.toggle('hidden', !!def.bare);

    // 顶部 tab 高亮同步
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === def.tab);
    });

    console.log('[CityWalk] 路由切换 → ' + r.path + (r.param ? '/' + r.param : ''));
    def.render(container, r.param);
  }

  /** 全局导航代理：带 data-nav 属性的元素点击即跳转 */
  function bindGlobalNav() {
    document.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav) location.hash = nav.getAttribute('data-nav');
    });
  }

  function init() {
    console.log('[CityWalk] 应用启动，时间=' + new Date().toLocaleString('zh-CN'));
    bindGlobalNav();
    window.addEventListener('hashchange', route);
    route();
  }

  // DOM 就绪后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
