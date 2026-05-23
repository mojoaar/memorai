window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;
  var dom = App.dom;
  var state = App.state;

  App.generateId = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  App.escapeHtml = function (str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  App.formatDate = function (ts) {
    var d = new Date(ts);
    var month = d.toLocaleDateString(undefined, { month: 'short' });
    var day = d.getDate();
    return month + ' ' + day + ', ' + d.getFullYear();
  };

  App.formatTime = function (ts) {
    var d = new Date(ts);
    if (state.settings.timeFormat === '24h') {
      var h = d.getHours().toString().padStart(2, '0');
      var m = d.getMinutes().toString().padStart(2, '0');
      return h + ':' + m;
    }
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  App.formatDateTime = function (ts) {
    return App.formatDate(ts) + ' ' + App.formatTime(ts);
  };

  App.toast = function (message, type) {
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    dom.toastContainer.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s ease';
      setTimeout(function () { el.remove(); }, 250);
    }, 3000);
  };
})();
