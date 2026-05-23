window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;
  var dom = App.dom;
  var state = App.state;

  App.resizeImage = function (file, maxW, maxH) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          if (w <= maxW && h <= maxH) { resolve(e.target.result); return; }
          var ratio = Math.min(maxW / w, maxH / h);
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(w * ratio);
          canvas.height = Math.round(h * ratio);
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL(file.type || 'image/png', 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  App.handleImageFile = function (file) {
    if (!file || !file.type.match(/^image\//)) return false;
    App.toast('Processing image\u2026', 'info');
    App.resizeImage(file, 1200, 1200).then(function (dataUrl) {
      var now = new Date();
      var ts = now.getFullYear() +
        ('' + (now.getMonth() + 1)).padStart(2, '0') +
        ('' + now.getDate()).padStart(2, '0') + '-' +
        ('' + now.getHours()).padStart(2, '0') +
        ('' + now.getMinutes()).padStart(2, '0') +
        ('' + now.getSeconds()).padStart(2, '0');
      var ext = (file.type.match(/png/) ? 'png' : 'jpg');
      var filename = ts + '.' + ext;
      var name = file.name || 'image';
      name = name.replace(/[\[\]()]/g, '_');
      state.pendingImages.push({ filename: filename, dataUrl: dataUrl, name: name });
      App.insertMarkdownAtCursor('\n![' + name + '](images/' + filename + ')\n');
      dom.noteContent.focus();
      App.scheduleSave();
      App.toast('Image inserted', 'success');
    });
    return true;
  };

  App.insertMarkdownAtCursor = function (text) {
    var ta = dom.noteContent;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var before = ta.value.substring(0, start);
    var after = ta.value.substring(end);
    ta.value = before + text + after;
    ta.selectionStart = ta.selectionEnd = start + text.length;
    ta.focus();
  };

  App.wrapSelection = function (prefix, suffix, placeholder) {
    var ta = dom.noteContent;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    if (start !== end) {
      var selected = ta.value.substring(start, end);
      ta.value = ta.value.substring(0, start) + prefix + selected + suffix + ta.value.substring(end);
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = start + prefix.length + selected.length;
    } else {
      App.insertMarkdownAtCursor(prefix + placeholder + suffix);
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = start + prefix.length + placeholder.length;
    }
    ta.focus();
    App.scheduleSave();
  };

  App.insertHeading = function (level) {
    var ta = dom.noteContent;
    var prefix = '';
    for (var i = 0; i < level; i++) prefix += '#';
    prefix += ' ';
    var start = ta.selectionStart;
    var lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    ta.focus();
    ta.setSelectionRange(lineStart, lineStart);
    App.insertMarkdownAtCursor(prefix);
    ta.focus();
    App.scheduleSave();
  };

  App.insertLink = function () {
    var ta = dom.noteContent;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var hasSelection = start !== end;
    var selected = hasSelection ? ta.value.substring(start, end) : '';
    var text = hasSelection ? selected : 'link text';
    var placeholder = 'url';
    if (hasSelection) {
      ta.value = ta.value.substring(0, start) + '[' + text + '](' + placeholder + ')' + ta.value.substring(end);
      ta.selectionStart = start + text.length + 3;
      ta.selectionEnd = ta.selectionStart + placeholder.length;
    } else {
      App.insertMarkdownAtCursor('[' + text + '](' + placeholder + ')');
      ta.selectionStart = start + 1;
      ta.selectionEnd = start + 1 + text.length;
    }
    ta.focus();
    App.scheduleSave();
  };

  App.insertCode = function () {
    var ta = dom.noteContent;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var hasSelection = start !== end;
    if (hasSelection) {
      var selected = ta.value.substring(start, end);
      ta.value = ta.value.substring(0, start) + '```\n' + selected + '\n```' + ta.value.substring(end);
      ta.selectionStart = start + 4;
      ta.selectionEnd = start + 4;
    } else {
      App.insertMarkdownAtCursor('```js\n// your code here\n```');
      ta.selectionStart = start + 3;
      ta.selectionEnd = start + 5;
    }
    ta.focus();
    App.scheduleSave();
  };

  App.insertTable = function () {
    var ta = dom.noteContent;
    var start = ta.selectionStart;
    App.insertMarkdownAtCursor('\n| Column 1 | Column 2 |\n|----------|----------|\n|          |          |\n');
    ta.selectionStart = start + 3;
    ta.selectionEnd = start + 11;
    ta.focus();
    App.scheduleSave();
  };
})();
