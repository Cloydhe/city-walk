/**
 * llm.js —— 大模型调用封装（OpenAI 兼容接口）
 * 设计原则：
 * 1. 未配置 API Key 或调用失败时，全部自动降级到本地预设内容，保证演示可用
 * 2. 统一超时控制（15s），避免页面长时间等待
 * 3. 所有返回 JSON 的调用都做容错解析
 */
(function (global) {
  'use strict';

  var TIMEOUT_MS = 15000;

  function cfg() {
    return global.AppStore.getSettings().llm || {};
  }

  function isConfigured() {
    var c = cfg();
    return !!(c.baseUrl && c.apiKey && c.model);
  }

  /**
   * 底层对话请求（OpenAI /chat/completions 兼容）
   * @param {Array} messages 消息数组
   * @param {boolean} wantJson 是否要求 JSON 输出
   * @returns {Promise<string>} 模型文本输出
   */
  function chat(messages, wantJson) {
    var c = cfg();
    if (!isConfigured()) {
      return Promise.reject(new Error('LLM_NOT_CONFIGURED'));
    }
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    var body = {
      model: c.model,
      messages: messages,
      temperature: 0.8
    };
    // 部分兼容服务不支持 response_format，失败时不阻塞（由上层容错处理）
    if (wantJson) body.response_format = { type: 'json_object' };

    console.log('[CityWalk][LLM] 发起请求 model=' + c.model + ' json=' + !!wantJson);
    return fetch(c.baseUrl.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + c.apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    }).then(function (resp) {
      clearTimeout(timer);
      if (!resp.ok) throw new Error('LLM_HTTP_' + resp.status);
      return resp.json();
    }).then(function (data) {
      var text = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content : '';
      console.log('[CityWalk][LLM] 请求成功，输出长度=' + (text || '').length);
      return text;
    }).catch(function (err) {
      clearTimeout(timer);
      console.warn('[CityWalk][LLM] 请求失败，将使用本地兜底:', err.message);
      throw err;
    });
  }

  /** 从模型输出中容错提取 JSON 对象 */
  function parseJsonLoose(text) {
    try { return JSON.parse(text); } catch (e) { /* 继续尝试截取 */ }
    var m = String(text).match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e) { /* 放弃 */ }
    }
    return null;
  }

  /* ================= 业务调用 ================= */

  /**
   * 根据用户选择的多层关键词推荐城市
   * @param {Object} selections 五层选择 {mood, region, terrain, feature, activity}
   * @returns Promise<{cityId, reason, source:'ai'|'local'}>
   */
  function recommendCity(selections) {
    var cities = global.AppData.CITIES;
    // '都可以' 视为通配，不参与计分
    var words = Object.keys(selections)
      .map(function (k) { return selections[k]; })
      .filter(function (w) { return w && w !== '都可以'; });

    // 本地兜底：按关键词命中数计分
    function localMatch() {
      var best = null, bestScore = -1;
      cities.forEach(function (city) {
        var score = 0;
        words.forEach(function (w) {
          if (city.tags.indexOf(w) !== -1) score++;
        });
        if (score > bestScore) { bestScore = score; best = city; }
      });
      return {
        cityId: best.id,
        reason: best.desc,
        source: 'local'
      };
    }

    if (!isConfigured()) return Promise.resolve(localMatch());

    var cityBrief = cities.map(function (c) {
      return c.id + '（' + c.name + '：' + c.tags.join('、') + '）';
    }).join('\n');

    // 五层选择组织成自然语言描述，'都可以'不体现
    var parts = [];
    if (selections.mood) parts.push('此刻心情「' + selections.mood + '」');
    if (selections.region && selections.region !== '都可以') parts.push('偏爱「' + selections.region + '」');
    if (selections.terrain) parts.push('想看「' + selections.terrain + '」');
    if (selections.feature) parts.push('想体验「' + selections.feature + '」');
    if (selections.activity) parts.push('打算「' + selections.activity + '」');

    return chat([
      { role: 'system', content: '你是一位懂旅行的城市推荐师。只能从给定城市列表中选择。严格输出 JSON：{"cityId":"...","reason":"80字内推荐理由，口吻温暖有画面感"}' },
      { role: 'user', content: '可选城市：\n' + cityBrief + '\n\n旅行者' + parts.join('，') + '。请推荐匹配度最高的一个城市。' }
    ], true).then(function (text) {
      var obj = parseJsonLoose(text);
      if (obj && obj.cityId && global.AppData.getCity(obj.cityId)) {
        return { cityId: obj.cityId, reason: obj.reason || '', source: 'ai' };
      }
      return localMatch();
    }).catch(function () { return localMatch(); });
  }

  /**
   * 获取打卡点游玩指南（介绍/注意事项/交通/额外建议）
   * @returns Promise<{intro, tips, transport, extra, source}>
   */
  function spotGuide(cityName, spot) {
    var preset = {
      intro: spot.intro, tips: spot.tips, transport: spot.transport, extra: spot.extra,
      source: 'local'
    };
    if (!isConfigured()) return Promise.resolve(preset);

    return chat([
      { role: 'system', content: '你是当地资深导游。严格输出 JSON：{"intro":"景点介绍80字内","tips":"注意事项60字内","transport":"交通建议50字内","extra":"一条私藏建议40字内"}，口吻亲切实用。' },
      { role: 'user', content: '城市：' + cityName + '，景点：' + spot.name + '。请给出游玩指南。' }
    ], true).then(function (text) {
      var obj = parseJsonLoose(text);
      if (obj && obj.intro) {
        return {
          intro: obj.intro, tips: obj.tips || preset.tips,
          transport: obj.transport || preset.transport,
          extra: obj.extra || preset.extra, source: 'ai'
        };
      }
      return preset;
    }).catch(function () { return preset; });
  }

  /**
   * 城市概览与路线说明（推荐结果页使用）
   * @returns Promise<{overview, routeTip, source}>
   */
  function cityBrief(city) {
    var preset = { overview: city.desc, routeTip: '按编号顺序游览即为顺路安排，节奏松紧适中。', source: 'local' };
    if (!isConfigured()) return Promise.resolve(preset);

    var spotNames = city.spots.map(function (s) { return s.name; }).join('→');
    return chat([
      { role: 'system', content: '你是行程规划师。严格输出 JSON：{"overview":"城市气质描述60字内","routeTip":"针对给定路线的一句走心建议40字内"}' },
      { role: 'user', content: '城市：' + city.name + '。已规划最短顺路路线：' + spotNames + '。请写城市概览和路线建议。' }
    ], true).then(function (text) {
      var obj = parseJsonLoose(text);
      if (obj && obj.overview) {
        return { overview: obj.overview, routeTip: obj.routeTip || preset.routeTip, source: 'ai' };
      }
      return preset;
    }).catch(function () { return preset; });
  }

  /**
   * 便签文案润色
   * @returns Promise<string> 润色后文本（失败时返回原文）
   */
  function polishNote(rawText) {
    if (!isConfigured()) return Promise.resolve(rawText);
    return chat([
      { role: 'system', content: '你是旅行手账作家。把用户随手记录的打卡文字润色成一段有画面感的手账文案，保留原意和事实，不超过80字，直接输出润色后的文字，不要任何解释。' },
      { role: 'user', content: rawText }
    ], false).then(function (text) {
      var t = String(text || '').trim();
      return t || rawText;
    }).catch(function () { return rawText; });
  }

  /** 测试连接（设置页用） */
  function testConnection() {
    if (!isConfigured()) return Promise.reject(new Error('请先完整填写配置'));
    return chat([{ role: 'user', content: '用"连接成功"四个字回复我' }], false)
      .then(function () { return true; });
  }

  global.AppLLM = {
    isConfigured: isConfigured,
    recommendCity: recommendCity,
    spotGuide: spotGuide,
    cityBrief: cityBrief,
    polishNote: polishNote,
    testConnection: testConnection
  };
})(window);
