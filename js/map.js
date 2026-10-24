/**
 * map.js —— 手绘风地图渲染（SVG）
 * 包含：全国地图大盘（简化中国轮廓）、城市示意地图（打卡点 + 路线连线）
 * 说明：轮廓为手绘示意，不追求地理精确；通过 feTurbulence 滤镜实现蜡笔线条抖动感
 */
(function (global) {
  'use strict';

  /** 手绘抖动滤镜定义（所有地图共用，注入一次即可） */
  var SVG_DEFS =
    '<defs>' +
    // 蜡笔笔触抖动：让直线产生手绘的不规则边缘
    '<filter id="crayon" x="-5%" y="-5%" width="110%" height="110%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="5"/>' +
    '</filter>' +
    // 更强的抖动，用于小元素
    '<filter id="crayon-strong" x="-8%" y="-8%" width="116%" height="116%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="4"/>' +
    '</filter>' +
    '</defs>';

  /**
   * 简化中国轮廓（viewBox 800x640），示意用途
   * 轮廓关键拐点按真实经纬度近似映射：x=(lon-73)/62*800, y=(53.5-lat)/35.5*640
   * 从西藏阿里起顺时针：新疆（鸡尾）→ 内蒙古 → 黑龙江（鸡头）→ 沿海 → 云南 → 藏南闭合
   */
  var CHINA_PATH =
    'M 77 405 ' +
    'C 55 385 35 350 25 315 C 15 290 5 275 10 255 ' +
    'C 14 235 20 210 32 190 C 45 165 65 150 95 138 ' +
    // 阿勒泰 → 中蒙边境明显向南凹陷（蒙古国在界外），至内蒙中部约42°N
    'C 125 122 160 100 194 84 C 222 102 248 132 284 152 ' +
    'C 322 174 380 196 428 200 C 472 200 512 178 536 148 ' +
    // 向东抬升至满洲里（49.5°N），再向东北至漠河
    'C 552 124 560 96 570 74 C 585 52 610 14 630 4 ' +
    'C 660 0 685 20 700 45 C 720 65 760 80 790 96 ' +
    'C 796 112 775 135 758 158 C 746 178 740 195 726 212 ' +
    'C 712 226 690 238 668 246 C 655 250 648 256 640 264 ' +
    'C 628 258 610 252 596 256 C 584 260 576 264 582 272 ' +
    'C 588 282 600 286 614 282 C 628 278 640 282 642 292 ' +
    'C 644 302 632 310 622 320 C 614 332 606 338 604 348 ' +
    'C 606 366 620 385 626 400 C 630 414 624 420 618 428 ' +
    'C 610 446 606 458 598 478 C 590 498 585 510 580 522 ' +
    'C 570 538 552 550 528 560 C 510 568 494 584 482 596 ' +
    'C 472 604 460 596 454 582 C 446 572 436 568 422 571 ' +
    'C 400 577 372 581 350 577 C 330 572 322 552 318 533 ' +
    'C 312 512 298 482 274 463 C 248 450 205 442 165 432 ' +
    'C 130 424 100 416 77 405 Z';

  /** 海南岛（三亚方位）与台湾岛（福建东南海面） */
  var HAINAN_PATH = 'M 462 608 C 470 600 485 600 492 610 C 498 620 490 632 476 632 C 464 632 456 620 462 608 Z';
  var TAIWAN_PATH = 'M 612 514 C 620 508 628 514 626 530 C 624 546 616 552 610 544 C 605 536 606 522 612 514 Z';

  /** 密集城市标签微调：避免与邻国界线/岛屿重叠（dx/dy 偏移，anchor 对齐） */
  var LABEL_ADJUST = {
    xiamen: { dx: -14, anchor: 'end' },
    hangzhou: { dx: -14, anchor: 'end' },
    qingdao: { dx: -14, anchor: 'end' },
    chongqing: { dy: 10 },
    shanghai: { dy: -6 }
  };

  /**
   * 渲染全国地图大盘
   * @param {Array<{id,name,mapX,mapY,color}>} cities 全部城市
   * @param {Array<string>} visitedIds 已游览城市 id
   * @returns {string} svg html
   */
  function renderChinaMap(cities, visitedIds) {
    var dots = cities.map(function (c) {
      var visited = visitedIds.indexOf(c.id) !== -1;
      var dotColor = visited ? '#d94f3d' : '#b9ac9c';
      // 密集城市标签微调，防止文字与边界/岛屿/其他标签重叠
      var adj = LABEL_ADJUST[c.id] || {};
      var labelX = c.mapX + (adj.dx != null ? adj.dx : 14);
      var labelY = c.mapY + 5 + (adj.dy || 0);
      var anchor = adj.anchor || 'start';
      var label =
        '<g class="map-city' + (visited ? ' visited' : '') + '" data-city="' + c.id + '" style="cursor:pointer">' +
        '<circle cx="' + c.mapX + '" cy="' + c.mapY + '" r="' + (visited ? 10 : 6) + '" fill="' + dotColor + '" stroke="#fff8ec" stroke-width="2.5" filter="url(#crayon-strong)"/>' +
        (visited ? '<circle cx="' + c.mapX + '" cy="' + c.mapY + '" r="15" fill="none" stroke="#d94f3d" stroke-width="1.5" stroke-dasharray="4 4" class="map-pulse"/>' : '') +
        '<text x="' + labelX + '" y="' + labelY + '" text-anchor="' + anchor + '" class="map-city-label' + (visited ? ' visited' : '') + '">' + c.name + '</text>' +
        '</g>';
      return label;
    }).join('');

    return '' +
      '<svg class="china-map" viewBox="0 0 800 640" xmlns="http://www.w3.org/2000/svg">' +
      SVG_DEFS +
      // 海面装饰波浪（东南海面）
      '<path d="M 640 585 Q 680 575 720 585" fill="none" stroke="#9cc3d9" stroke-width="3" stroke-linecap="round" filter="url(#crayon-strong)"/>' +
      '<path d="M 660 602 Q 695 594 730 602" fill="none" stroke="#9cc3d9" stroke-width="3" stroke-linecap="round" filter="url(#crayon-strong)"/>' +
      // 国土轮廓
      '<path d="' + CHINA_PATH + '" fill="#f2e7c9" stroke="#5d4f3e" stroke-width="4" stroke-linejoin="round" filter="url(#crayon)"/>' +
      '<path d="' + HAINAN_PATH + '" fill="#f2e7c9" stroke="#5d4f3e" stroke-width="3" filter="url(#crayon-strong)"/>' +
      '<path d="' + TAIWAN_PATH + '" fill="#f2e7c9" stroke="#5d4f3e" stroke-width="3" filter="url(#crayon-strong)"/>' +
      // 内部装饰：山脉（青藏高原方向）与云（西北）
      '<path d="M 180 330 l 18 -24 l 18 24 M 206 330 l 14 -18 l 14 18" fill="none" stroke="#b9a888" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#crayon-strong)"/>' +
      '<path d="M 250 180 q 12 -14 26 0 q 12 -10 20 2" fill="none" stroke="#c9b998" stroke-width="2.5" stroke-linecap="round" filter="url(#crayon-strong)"/>' +
      dots +
      '</svg>';
  }

  /**
   * 渲染城市示意地图（含打卡点编号与游览路线）
   * @param {Object} city 城市对象
   * @param {Object} opts { doneSpots:[], interactive:bool, highlightIndex:number }
   * @returns {string} svg html
   */
  function renderCityMap(city, opts) {
    opts = opts || {};
    var doneSpots = opts.doneSpots || [];

    // 路线：按数组顺序连接打卡点（虚线，流动动画）
    var routePath = city.spots.map(function (s, i) {
      return (i === 0 ? 'M ' : ' L ') + s.mapX + ' ' + s.mapY;
    }).join('');

    var spotNodes = city.spots.map(function (s, i) {
      var done = doneSpots.indexOf(s.id) !== -1;
      var fill = done ? '#7fb685' : '#e8a54b';
      var inner = '<text x="' + s.mapX + '" y="' + (s.mapY + 5) + '" class="city-spot-num">' + (done ? '✓' : (i + 1)) + '</text>';
      return '<g class="city-spot' + (opts.interactive ? ' interactive' : '') + '" data-spot-index="' + i + '"' + (opts.interactive ? ' style="cursor:pointer"' : '') + '>' +
        '<circle cx="' + s.mapX + '" cy="' + s.mapY + '" r="14" fill="' + fill + '" stroke="#fff8ec" stroke-width="3" filter="url(#crayon-strong)"/>' +
        inner +
        '<text x="' + s.mapX + '" y="' + (s.mapY + 30) + '" class="city-spot-label">' + s.name + '</text>' +
        '</g>';
    }).join('');

    return '' +
      '<svg class="city-map" viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg">' +
      SVG_DEFS +
      // 城市不规则边界（手绘 blob）
      '<path d="M 60 55 C 110 25 200 20 270 32 C 340 45 395 80 400 150 C 405 220 370 280 290 300 C 210 318 110 305 65 260 C 20 215 15 120 60 55 Z" fill="#f6eeda" stroke="#5d4f3e" stroke-width="3.5" filter="url(#crayon)"/>' +
      // 河流
      '<path d="M 20 260 C 90 235 130 255 200 235 C 270 215 320 235 410 200" fill="none" stroke="#9cc3d9" stroke-width="7" stroke-linecap="round" opacity="0.75" filter="url(#crayon-strong)"/>' +
      // 街道虚线
      '<path d="M 80 90 C 150 110 240 100 330 130" fill="none" stroke="#cbbfa5" stroke-width="2.5" stroke-dasharray="7 6" filter="url(#crayon-strong)"/>' +
      '<path d="M 100 280 C 150 240 200 220 300 160" fill="none" stroke="#cbbfa5" stroke-width="2.5" stroke-dasharray="7 6" filter="url(#crayon-strong)"/>' +
      // 装饰：太阳与云、远山
      '<circle cx="365" cy="52" r="16" fill="#f2c14e" stroke="#5d4f3e" stroke-width="3" filter="url(#crayon-strong)"/>' +
      '<path d="M 48 60 q 10 -13 23 -2 q 13 -11 24 2" fill="none" stroke="#b8cbd6" stroke-width="3" stroke-linecap="round" filter="url(#crayon-strong)"/>' +
      '<path d="M 45 300 l 16 -22 l 16 22" fill="none" stroke="#a8b493" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#crayon-strong)"/>' +
      // 游览路线（流动虚线）
      '<path d="' + routePath + '" fill="none" stroke="#d94f3d" stroke-width="3" stroke-dasharray="9 7" stroke-linecap="round" class="route-line" filter="url(#crayon-strong)"/>' +
      spotNodes +
      '</svg>';
  }

  /**
   * 迷你路线图（结果页小尺寸预览，无文字标签）
   */
  function renderRouteMini(city) {
    var routePath = city.spots.map(function (s, i) {
      return (i === 0 ? 'M ' : ' L ') + s.mapX + ' ' + s.mapY;
    }).join('');
    var dots = city.spots.map(function (s, i) {
      return '<g>' +
        '<circle cx="' + s.mapX + '" cy="' + s.mapY + '" r="10" fill="#e8a54b" stroke="#fff8ec" stroke-width="2.5"/>' +
        '<text x="' + s.mapX + '" y="' + (s.mapY + 4) + '" class="city-spot-num mini">' + (i + 1) + '</text>' +
        '</g>';
    }).join('');
    return '<svg class="route-mini" viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M 60 55 C 110 25 200 20 270 32 C 340 45 395 80 400 150 C 405 220 370 280 290 300 C 210 318 110 305 65 260 C 20 215 15 120 60 55 Z" fill="#f6eeda" stroke="#5d4f3e" stroke-width="4"/>' +
      '<path d="' + routePath + '" fill="none" stroke="#d94f3d" stroke-width="3.5" stroke-dasharray="9 7" stroke-linecap="round" class="route-line"/>' +
      dots +
      '</svg>';
  }

  global.AppMap = {
    renderChinaMap: renderChinaMap,
    renderCityMap: renderCityMap,
    renderRouteMini: renderRouteMini
  };
})(window);
