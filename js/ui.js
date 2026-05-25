window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;
  var dom = App.dom;
  var state = App.state;

  App.renderNotesList = function () {
    var query = (dom.searchInput.value || '').toLowerCase().trim();
    var sorted = App.getSortedNotes();
    var filtered = sorted;
    if (query) {
      filtered = sorted.filter(function (n) {
        return n.title.toLowerCase().indexOf(query) !== -1 ||
               n.content.toLowerCase().indexOf(query) !== -1 ||
               (n.tags || []).some(function (t) { return t.toLowerCase().indexOf(query) !== -1; });
      });
    }
    dom.notesList.innerHTML = '';
    if (filtered.length === 0) {
      dom.notesList.innerHTML = '\n        <div class="empty-state">\n          <i data-lucide="file-text" width="48" height="48"></i>\n          <p>' + (query ? 'No matching notes' : 'No notes yet') + '</p>\n          <span>' + (query ? 'Try a different search' : 'Create one to get started') + '</span>\n        </div>';
      App.refreshIcons(dom.notesList);
      return;
    }
    var isCompact = state.settings.noteDisplay === 'compact';
    filtered.forEach(function (note) {
      var el = document.createElement('div');
      el.className = 'note-item' + (note.id === state.activeNoteId ? ' active' : '');
      el.dataset.id = note.id;
      var preview = note.content.replace(/\n/g, ' ').trim().slice(0, 80) || 'Empty note';
      var dateStr = App.formatDate(note.updatedAt);
      if (isCompact) {
        el.innerHTML = '\n        <div class="note-item-header">\n          <span class="note-item-title">' + App.escapeHtml(note.title || 'Untitled') + '</span>\n          ' + (note.pinned ? '<i data-lucide="pin" class="note-item-pin" width="14" height="14"></i>' : '') + '\n        </div>\n        ' + App.tagsToHtml(note.tags) + '\n      ';
      } else {
        el.innerHTML = '\n        <div class="note-item-header">\n          <span class="note-item-title">' + App.escapeHtml(note.title || 'Untitled') + '</span>\n          ' + (note.pinned ? '<i data-lucide="pin" class="note-item-pin" width="14" height="14"></i>' : '') + '\n        </div>\n        <div class="note-item-preview">' + App.escapeHtml(preview) + '</div>\n        ' + App.tagsToHtml(note.tags) + '\n        <div class="note-item-date">' + dateStr + '</div>\n      ';
      }
      el.addEventListener('click', function () { App.openNote(note.id); });
      dom.notesList.appendChild(el);
    });
    App.refreshIcons(dom.notesList);
  };

  App.openNote = function (id) {
    var note = state.notes.find(function (n) { return n.id === id; });
    if (!note) return;
    if (state.saveTimeout) { clearTimeout(state.saveTimeout); state.saveTimeout = null; }
    if (state.activeNoteId) { App.doAutoSave(); }
    state.activeNoteId = id;
    dom.noteTitle.value = note.title;
    dom.noteContent.value = note.content;
    App.setActiveTags(note.tags || []);
    dom.lastModified.textContent = 'Last modified: ' + App.formatDateTime(note.updatedAt);
    if (state.isPreview) { App.switchToPreview(true); } else { App.switchToEdit(); }
    dom.editorEmpty.classList.add('hidden');
    dom.editorContent.classList.remove('hidden');
    dom.noteTitle.focus();
    App.updatePinButton();
    App.renderNotesList();
    if (window.innerWidth <= 768) App.closeSidebar();
    history.replaceState(null, '', '#' + id);
  };

  App.showEmptyEditor = function () {
    state.activeNoteId = null;
    dom.noteTitle.value = '';
    dom.noteContent.value = '';
    dom.noteTags.value = '';
    state.currentTags = [];
    dom.tagsList.innerHTML = '';
    dom.lastModified.textContent = '';
    App.switchToEdit();
    dom.editorEmpty.classList.remove('hidden');
    dom.editorContent.classList.add('hidden');
    App.renderNotesList();
    history.replaceState(null, '', window.location.pathname);
  };

  App.updatePinButton = function () {
    if (!state.activeNoteId) return;
    var note = state.notes.find(function (n) { return n.id === state.activeNoteId; });
    if (!note) return;
    dom.pinBtn.style.color = note.pinned ? 'var(--warning)' : '';
  };

  App.updateNoteCount = function () {
    dom.noteCount.textContent = state.notes.length + ' note' + (state.notes.length !== 1 ? 's' : '');
  };

  App.applyTheme = function () {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  };

  App.setTheme = function (theme) {
    state.settings.theme = theme;
    App.applyTheme();
    if (dom.themeSelect) dom.themeSelect.value = theme;
    App.updateThemeIcon();
    App.saveSettings();
  };

  App.updateThemeIcon = function () {
    var isDark = state.settings.theme.indexOf('dark') !== -1;
    var btn = dom.themeToggle;
    if (!btn) return;
    var existing = btn.querySelector('svg[id="themeToggleIcon"], i#themeToggleIcon');
    if (existing) existing.remove();
    var i = document.createElement('i');
    i.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    i.setAttribute('id', 'themeToggleIcon');
    i.setAttribute('width', '20');
    i.setAttribute('height', '20');
    btn.appendChild(i);
    App.refreshIcons(btn);
  };

  App.switchToEdit = function () {
    state.isPreview = false;
    dom.noteContent.classList.remove('hidden');
    dom.notePreview.classList.add('hidden');
    dom.editBtn.classList.add('active');
    dom.previewBtn.classList.remove('active');
  };

  App.switchToPreview = function (skipSave) {
    if (!skipSave && state.activeNoteId) { App.doAutoSave(); }
    state.isPreview = true;
    var html = App.renderMarkdown(dom.noteContent.value);
    html = App.processIconShortcodes(html);
    html = App.rewriteImageURLs(html);
    if (typeof DOMPurify !== 'undefined') {
      html = DOMPurify.sanitize(html);
    }
    dom.notePreview.innerHTML = html;
    dom.noteContent.classList.add('hidden');
    dom.notePreview.classList.remove('hidden');
    dom.editBtn.classList.remove('active');
    dom.previewBtn.classList.add('active');
    App.refreshIcons(dom.notePreview);
    App.addCodeEnhancements(dom.notePreview);
  };

  App.addCodeEnhancements = function (container) {
    var pres = container.querySelectorAll('pre');
    pres.forEach(function (pre) {
      var code = pre.querySelector('code');
      if (!code) return;

      // Copy button
      var copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy-btn';
      copyBtn.title = 'Copy code';
      copyBtn.setAttribute('aria-label', 'Copy code');
      var copyIcon = document.createElement('i');
      copyIcon.setAttribute('data-lucide', 'copy');
      copyIcon.setAttribute('width', '14');
      copyIcon.setAttribute('height', '14');
      copyBtn.appendChild(copyIcon);
      copyBtn.addEventListener('click', function () {
        var text = code.textContent;
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.innerHTML = '';
          var checkIcon = document.createElement('i');
          checkIcon.setAttribute('data-lucide', 'check');
          checkIcon.setAttribute('width', '14');
          checkIcon.setAttribute('height', '14');
          copyBtn.appendChild(checkIcon);
          App.refreshIcons(copyBtn);
          setTimeout(function () {
            copyBtn.innerHTML = '';
            var icon = document.createElement('i');
            icon.setAttribute('data-lucide', 'copy');
            icon.setAttribute('width', '14');
            icon.setAttribute('height', '14');
            copyBtn.appendChild(icon);
            App.refreshIcons(copyBtn);
          }, 1500);
        }).catch(function () {
          App.toast('Failed to copy code', 'error');
        });
      });
      pre.appendChild(copyBtn);
      App.refreshIcons(copyBtn);

      // Line numbers
      if (state.settings.codeLineNumbers) {
        var lines = code.textContent.split('\n');
        if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
        var gutter = document.createElement('span');
        gutter.className = 'ln-gutter';
        gutter.setAttribute('aria-hidden', 'true');
        gutter.textContent = lines.map(function (_, i) { return i + 1; }).join('\n');
        pre.insertBefore(gutter, code);
        pre.classList.add('has-line-numbers');
      }
    });
  };

  App.rewriteImageURLs = function (html) {
    var s = state.settings;
    if (!s.repo) return html;
    var base = 'https://raw.githubusercontent.com/' + s.repo + '/' + s.branch + '/';
    return html.replace(/src="images\/([^"]+)"/g, 'src="' + base + 'images/$1"');
  };

  App.togglePreview = function () {
    if (state.isPreview) { App.switchToEdit(); } else { App.switchToPreview(); }
  };

  App.scheduleSave = function () {
    if (state.saveTimeout) clearTimeout(state.saveTimeout);
    state.saveTimeout = setTimeout(App.doAutoSave, 500);
  };

  App.doAutoSave = function () {
    if (!state.activeNoteId) return;
    var title = dom.noteTitle.value;
    var content = dom.noteContent.value;
    var tags = App.getActiveTags();
    App.updateNote(state.activeNoteId, { title: title, content: content, tags: tags });
    App.renderNotesList();
    dom.lastModified.textContent = 'Last modified: ' + App.formatDateTime(Date.now());
  };

  App.toggleSidebar = function () {
    dom.sidebar.classList.toggle('open');
    if (dom.sidebar.classList.contains('open')) { App.showSidebarBackdrop(); } else { App.removeSidebarBackdrop(); }
  };

  App.openSidebar = function () { dom.sidebar.classList.add('open'); App.showSidebarBackdrop(); };
  App.closeSidebar = function () { dom.sidebar.classList.remove('open'); App.removeSidebarBackdrop(); };

  App.addToolbarTooltips = function () {
    document.querySelectorAll('.btn-fmt, .btn-icon').forEach(function (btn) {
      if (btn.getAttribute('aria-label') && !btn.getAttribute('title')) {
        btn.setAttribute('title', btn.getAttribute('aria-label'));
      }
    });
  };

  App.updateRepoDependentUI = function () {
    var hasRepo = !!(state.settings.repo && state.settings.githubToken);
    if (dom.syncBtn) dom.syncBtn.style.display = hasRepo ? '' : 'none';
    if (dom.wipeBtn) dom.wipeBtn.style.display = hasRepo ? '' : 'none';
    // hide the entire danger zone if no repo
    var zone = document.querySelector('.danger-zone');
    if (zone) zone.style.display = hasRepo ? '' : 'none';
  };

  App.showSidebarBackdrop = function () {
    if (state.sidebarBackdrop) return;
    state.sidebarBackdrop = document.createElement('div');
    state.sidebarBackdrop.className = 'sidebar-backdrop visible';
    state.sidebarBackdrop.addEventListener('click', App.closeSidebar);
    document.body.appendChild(state.sidebarBackdrop);
  };

  App.removeSidebarBackdrop = function () {
    if (state.sidebarBackdrop) { state.sidebarBackdrop.remove(); state.sidebarBackdrop = null; }
  };

  App.showWipeConfirm = function () {
    if (!dom.wipeBtn || !dom.wipeConfirm) return;
    dom.wipeBtn.classList.add('hidden');
    dom.wipeConfirm.classList.remove('hidden');
    dom.wipeInput.value = '';
    dom.wipeConfirmBtn.disabled = true;
    dom.wipeInput.focus();
  };

  App.hideWipeConfirm = function () {
    if (!dom.wipeBtn || !dom.wipeConfirm) return;
    dom.wipeBtn.classList.remove('hidden');
    dom.wipeConfirm.classList.add('hidden');
    dom.wipeInput.value = '';
    dom.wipeConfirmBtn.disabled = true;
  };

  App.disableServerFields = function () {
    if (!state.hasServerConfig) return;
    var fields = [
      { el: dom.githubToken, hint: document.getElementById('githubTokenHint'), key: 'githubToken' },
      { el: dom.repoInput, hint: document.getElementById('repoHint'), key: 'repo' },
      { el: dom.branchInput, hint: document.getElementById('branchHint'), key: 'branch' },
    ];
    fields.forEach(function (f) {
      if (!f.el) return;
      var hasValue = !!state.settings[f.key];
      f.el.disabled = hasValue;
      if (f.hint) f.hint.classList.toggle('hidden', !hasValue);
    });
  };
})();
