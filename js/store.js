/**
 * store.js —— localStorage 持久化封装
 * 统一管理本应用所有本地数据：设置、游览记录、便签、当前旅程
 * 所有 key 统一前缀 citywalk_，避免与其他应用冲突
 */
(function (global) {
  'use strict';

  var PREFIX = 'citywalk_';

  /** 基础读写：JSON 序列化 + 异常兜底 */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.error('[CityWalk][Store] 读取失败 key=' + key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      // 常见原因：图片 base64 超出 localStorage 5MB 配额
      console.error('[CityWalk][Store] 写入失败 key=' + key, e);
      return false;
    }
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  /** 生成简短唯一 id（时间戳 + 随机串） */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  global.AppStore = {
    /* ---------- 大模型设置 ---------- */
    getSettings: function () {
      return read('settings', {
        llm: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' }
      });
    },
    saveSettings: function (s) { return write('settings', s); },

    /* ---------- 引导页是否已看过 ---------- */
    isOnboarded: function () { return read('onboarded', false); },
    markOnboarded: function () { return write('onboarded', true); },

    /* ---------- 游览记录：{ cityId: { visitedAt, doneSpots:[spotId], finished } } ---------- */
    getVisited: function () { return read('visited', {}); },
    getCityVisit: function (cityId) { return this.getVisited()[cityId] || null; },
    /** 记录某打卡点完成 */
    markSpotDone: function (cityId, spotId) {
      var visited = this.getVisited();
      if (!visited[cityId]) {
        visited[cityId] = { visitedAt: Date.now(), doneSpots: [], finished: false };
      }
      if (visited[cityId].doneSpots.indexOf(spotId) === -1) {
        visited[cityId].doneSpots.push(spotId);
      }
      var city = global.AppData.getCity(cityId);
      if (city && visited[cityId].doneSpots.length >= city.spots.length) {
        visited[cityId].finished = true;
      }
      write('visited', visited);
      console.log('[CityWalk][Store] 打卡完成 city=' + cityId + ' spot=' + spotId);
    },
    /** 已游览城市 id 列表 */
    getVisitedCityIds: function () { return Object.keys(this.getVisited()); },

    /* ---------- 当前进行中的旅程：{ cityId, currentIndex, startedAt } ---------- */
    getTrip: function () { return read('trip', null); },
    saveTrip: function (trip) { return write('trip', trip); },
    clearTrip: function () { remove('trip'); },

    /* ---------- 便签墙 ---------- */
    /** 便签结构: { id, cityId, spotId, text, img, color, x, y, rotate, polished, createdAt } */
    getNotes: function () { return read('notes', []); },
    addNote: function (note) {
      var notes = this.getNotes();
      note.id = uid();
      note.createdAt = Date.now();
      notes.unshift(note);
      var ok = write('notes', notes);
      console.log('[CityWalk][Store] 新增便签 id=' + note.id + ' 写入' + (ok ? '成功' : '失败(可能超出存储配额)'));
      return ok ? note : null;
    },
    updateNote: function (id, patch) {
      var notes = this.getNotes();
      var idx = notes.findIndex(function (n) { return n.id === id; });
      if (idx === -1) return false;
      for (var k in patch) notes[idx][k] = patch[k];
      return write('notes', notes);
    },
    deleteNote: function (id) {
      var notes = this.getNotes().filter(function (n) { return n.id !== id; });
      return write('notes', notes);
    },
    /** 某打卡点是否已有便签 */
    hasNoteForSpot: function (cityId, spotId) {
      return this.getNotes().some(function (n) {
        return n.cityId === cityId && n.spotId === spotId;
      });
    },

    /* ---------- 数据管理 ---------- */
    clearAll: function () {
      var keys = ['settings', 'onboarded', 'visited', 'trip', 'notes'];
      keys.forEach(remove);
      console.log('[CityWalk][Store] 已清空全部本地数据');
    }
  };
})(window);
