window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;
  var dom = App.dom;
  var state = App.state;

  App.loadSettings = function () {
    try {
      var raw = localStorage.getItem(App.STORE_SETTINGS);
      if (raw) {
        state.settings = JSON.parse(JSON.stringify(App.DEFAULT_SETTINGS));
        var parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(function (k) { state.settings[k] = parsed[k]; });
      }
      dom.githubToken.value = state.settings.githubToken || '';
      dom.repoInput.value = state.settings.repo || '';
      dom.branchInput.value = state.settings.branch || 'main';
      if (dom.themeSelect) dom.themeSelect.value = state.settings.theme;
      if (dom.timeFormatSelect) dom.timeFormatSelect.value = state.settings.timeFormat;
      if (dom.noteDisplaySelect) dom.noteDisplaySelect.value = state.settings.noteDisplay;
      if (dom.sortBySelect) dom.sortBySelect.value = state.settings.sortBy;
    } catch (e) {
      state.settings = JSON.parse(JSON.stringify(App.DEFAULT_SETTINGS));
    }
  };

  App.saveSettings = function () {
    if (!dom.githubToken.disabled) state.settings.githubToken = dom.githubToken.value.trim();
    if (!dom.repoInput.disabled) state.settings.repo = dom.repoInput.value.trim();
    if (!dom.branchInput.disabled) state.settings.branch = dom.branchInput.value.trim() || 'main';
    try {
      localStorage.setItem(App.STORE_SETTINGS, JSON.stringify(state.settings));
    } catch (e) {
      App.toast && App.toast('Failed to save settings: storage full', 'error');
    }
  };

  App.loadServerConfig = function () {
    return fetch('/config.json').then(function (r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function (config) {
      if (!config) return;
      state.hasServerConfig = true;
      if (config.githubToken) state.settings.githubToken = config.githubToken;
      if (config.repo) state.settings.repo = config.repo;
      if (config.branch) state.settings.branch = config.branch;
      if (config.title) document.title = config.title;
      if (config.description) {
        var meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', config.description);
      }

      var baseUrl = config.url || window.location.origin;
      var title = config.title || document.title;
      var desc = config.description || 'Your second brain, in markdown';

      setMeta('og:title', 'ogTitle', title);
      setMeta('og:description', 'ogDesc', desc);
      setMeta('og:url', 'ogUrl', baseUrl);
      setMeta('twitter:title', 'twTitle', title);
      setMeta('twitter:description', 'twDesc', desc);
      setMeta('twitter:image', 'twImage', baseUrl + '/og-image.png');
      setMeta('og:image', 'ogImage', baseUrl + '/og-image.png');

      var canonical = document.getElementById('canonicalUrl');
      if (canonical) canonical.href = baseUrl;

      var sd = document.getElementById('structuredData');
      if (sd) {
        var data = JSON.parse(sd.textContent);
        data.name = config.title || 'memorai';
        data.description = desc;
        data.url = baseUrl;
        sd.textContent = JSON.stringify(data, null, 2);
      }

      dom.githubToken.value = state.settings.githubToken || '';
      dom.repoInput.value = state.settings.repo || '';
      dom.branchInput.value = state.settings.branch || 'main';
    }).catch(function () {
      // Silently skip — config.json is optional
    });
  };

  function setMeta(name, id, value) {
    var el = document.getElementById(id);
    if (el) el.setAttribute('content', value);
  }
  App.loadNotes = function () {
    try {
      var raw = localStorage.getItem(App.STORE_NOTES);
      if (raw) {
        state.notes = JSON.parse(raw);
        state.notes.forEach(function (n) {
          if (!n.id) n.id = App.generateId();
          if (!n.createdAt) n.createdAt = Date.now();
          if (!n.updatedAt) n.updatedAt = Date.now();
          if (n.pinned === undefined) n.pinned = false;
          if (!Array.isArray(n.tags)) n.tags = [];
        });
      }
    } catch (e) {
      state.notes = [];
    }
  };

  App.saveNotes = function () {
    try {
      localStorage.setItem(App.STORE_NOTES, JSON.stringify(state.notes));
    } catch (e) {
      App.toast && App.toast('Failed to save notes: storage full', 'error');
    }
  };
})();
