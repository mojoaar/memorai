window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;
  var dom = App.dom;
  var state = App.state;

  App.configureMarked = function () {
    if (typeof marked === 'undefined') return;
    var opts = { breaks: true, gfm: true };
    if (typeof hljs !== 'undefined') {
      opts.highlight = function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return code;
      };
    }
    marked.setOptions(opts);
  };

  App.init = function () {
    App.loadSettings();
    App.loadNotes();
    App.loadServerConfig().then(function () {
      App.finishInit();
    }).catch(function () {
      App.finishInit();
    });
  };

  App.finishInit = function () {
    App.applyTheme();
    App.bindEvents();
    App.renderNotesList();
    App.updateNoteCount();
    App.configureMarked();
    App.refreshIcons();
    App.updateThemeIcon();
    App.updateRepoDependentUI();
    App.routeFromHash();
  };

  App.routeFromHash = function () {
    var id = window.location.hash.replace('#', '');
    if (id && state.notes.find(function (n) { return n.id === id; })) {
      App.openNote(id);
    }
  };

  App.bindEvents = function () {
    dom.newNoteBtn.addEventListener('click', App.createNote);
    dom.searchInput.addEventListener('input', App.renderNotesList);

    dom.noteTitle.addEventListener('input', App.scheduleSave);
    dom.noteContent.addEventListener('input', App.scheduleSave);

    dom.noteTags.addEventListener('keydown', function (e) {
      var suggestionsVisible = !dom.tagSuggestions.classList.contains('hidden');
      if (suggestionsVisible) {
        if (e.key === 'ArrowDown') { e.preventDefault(); App.navigateSuggestions(1); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); App.navigateSuggestions(-1); return; }
        if (e.key === 'Enter' && state.suggestionIndex >= 0) { e.preventDefault(); App.selectSuggestion(state.suggestionIndex); return; }
        if (e.key === 'Escape') { dom.tagSuggestions.classList.add('hidden'); state.suggestionIndex = -1; return; }
      }
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (state.suggestionIndex >= 0) { App.selectSuggestion(state.suggestionIndex); } else { App.addTagFromInput(); }
      }
      if (e.key === 'Backspace' && dom.noteTags.value === '') {
        var tags = App.getActiveTags();
        if (tags.length) { App.removeTag(tags[tags.length - 1]); }
      }
    });

    dom.noteTags.addEventListener('blur', function () {
      setTimeout(function () { dom.tagSuggestions.classList.add('hidden'); state.suggestionIndex = -1; App.addTagFromInput(); }, 150);
    });

    dom.noteTags.addEventListener('input', App.showSuggestions);

    dom.editBtn.addEventListener('click', App.switchToEdit);
    dom.previewBtn.addEventListener('click', App.switchToPreview);

    dom.backBtn.addEventListener('click', function () { App.showEmptyEditor(); if (window.innerWidth <= 768) App.openSidebar(); });

    dom.pinBtn.addEventListener('click', function () { if (!state.activeNoteId) return; App.togglePin(state.activeNoteId); });
    dom.deleteBtn.addEventListener('click', function () { if (!state.activeNoteId) return; App.deleteNote(state.activeNoteId); });
    dom.shareBtn.addEventListener('click', function () {
      if (!state.activeNoteId) return;
      navigator.clipboard.writeText(window.location.href).then(function () {
        App.toast('Link copied to clipboard', 'success');
      }).catch(function () {
        App.toast('Failed to copy link', 'error');
      });
    });

    dom.exportMdBtn.addEventListener('click', function () {
      if (!state.activeNoteId) return;
      var note = state.notes.find(function (n) { return n.id === state.activeNoteId; });
      if (!note) return;
      var md = App.noteToMD(note);
      var blob = new Blob([md], { type: 'text/markdown' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = (note.title || 'untitled').replace(/[^a-zA-Z0-9-_ ]/g, '') + '.md';
      a.click();
      URL.revokeObjectURL(url);
      App.toast('Exported as .md', 'success');
    });

    dom.imageBtn.addEventListener('click', function () { dom.imageFile.click(); });

    dom.iconBtn.addEventListener('click', function (e) { e.stopPropagation(); App.toggleIconPicker(); });
    dom.iconSearchInput.addEventListener('input', App.filterIconPicker);

    document.addEventListener('click', function (e) {
      if (dom.iconPicker.classList.contains('hidden')) return;
      if (!dom.iconPicker.contains(e.target) && e.target !== dom.iconBtn) { App.closeIconPicker(); }
    });

    dom.imageFile.addEventListener('change', function (e) {
      if (!e.target.files || !e.target.files.length) return;
      Array.from(e.target.files).forEach(function (file) { App.handleImageFile(file); });
      dom.imageFile.value = '';
    });

    dom.noteContent.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.match(/^image\//)) { e.preventDefault(); App.handleImageFile(items[i].getAsFile()); return; }
      }
    });

    dom.editorContent.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); });
    dom.editorContent.addEventListener('drop', function (e) {
      e.preventDefault(); e.stopPropagation();
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      Array.from(files).forEach(function (file) { App.handleImageFile(file); });
    });

    document.querySelectorAll('.btn-fmt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fmt = btn.dataset.fmt;
        if (fmt === 'h1') App.insertHeading(1);
        else if (fmt === 'h2') App.insertHeading(2);
        else if (fmt === 'h3') App.insertHeading(3);
        else if (fmt === 'bold') App.wrapSelection('**', '**', 'bold');
        else if (fmt === 'italic') App.wrapSelection('*', '*', 'italic');
        else if (fmt === 'underline') App.wrapSelection('__', '__', 'underline');
        else if (fmt === 'strikethrough') App.wrapSelection('~~', '~~', 'strikethrough');
        else if (fmt === 'link') App.insertLink();
        else if (fmt === 'code') App.insertCode();
        else if (fmt === 'table') App.insertTable();
        else if (fmt === 'ul') App.insertList('-');
        else if (fmt === 'ol') App.insertList('1.');
        else if (fmt === 'task') App.insertList('- [ ]');
        else if (fmt === 'hr') App.insertMarkdownAtCursor('\n---\n');
      });
    });

    dom.sidebarToggle.addEventListener('click', App.toggleSidebar);

    dom.themeToggle.addEventListener('click', function () {
      var isDark = state.settings.theme.indexOf('dark') !== -1;
      var palette = state.settings.theme.replace(/-dark|-light/, '');
      App.setTheme(palette + (isDark ? '-light' : '-dark'));
    });

    dom.settingsToggle.addEventListener('click', function () {
      dom.settingsModal.classList.remove('hidden');
      dom.themeSelect.value = state.settings.theme;
      dom.timeFormatSelect.value = state.settings.timeFormat;
      dom.noteDisplaySelect.value = state.settings.noteDisplay;
      dom.sortBySelect.value = state.settings.sortBy;
      dom.githubToken.value = state.settings.githubToken || '';
      dom.repoInput.value = state.settings.repo || '';
      dom.branchInput.value = state.settings.branch || 'main';
      if (dom.settingsVersion) dom.settingsVersion.textContent = 'v' + App.VERSION;
      App.disableServerFields();
      App.updateRepoDependentUI();
      App.refreshIcons(dom.settingsModal);
    });

    dom.settingsClose.addEventListener('click', function () { dom.settingsModal.classList.add('hidden'); App.hideWipeConfirm(); App.saveSettings(); App.updateRepoDependentUI(); });

    dom.settingsModal.addEventListener('click', function (e) {
      if (e.target === dom.settingsModal) { dom.settingsModal.classList.add('hidden'); App.hideWipeConfirm(); App.saveSettings(); App.updateRepoDependentUI(); }
    });

    dom.themeSelect.addEventListener('change', function () { App.setTheme(dom.themeSelect.value); });

    dom.timeFormatSelect.addEventListener('change', function () {
      state.settings.timeFormat = dom.timeFormatSelect.value;
      App.saveSettings();
      if (state.activeNoteId) { dom.lastModified.textContent = 'Last modified: ' + App.formatDateTime(Date.now()); }
      App.renderNotesList();
    });

    dom.noteDisplaySelect.addEventListener('change', function () { state.settings.noteDisplay = dom.noteDisplaySelect.value; App.saveSettings(); App.renderNotesList(); });
    dom.sortBySelect.addEventListener('change', function () { state.settings.sortBy = dom.sortBySelect.value; App.saveSettings(); App.renderNotesList(); });

    dom.githubToken.addEventListener('change', function () { App.saveSettings(); App.updateRepoDependentUI(); });
    dom.repoInput.addEventListener('change', function () { App.saveSettings(); App.updateRepoDependentUI(); });
    dom.branchInput.addEventListener('change', App.saveSettings);

    dom.syncBtn.addEventListener('click', App.handleSync);

    dom.exportBtn.addEventListener('click', App.exportNotes);
    dom.importBtn.addEventListener('click', function () { dom.importFile.click(); });
    dom.importFile.addEventListener('change', function (e) { if (e.target.files && e.target.files[0]) { App.importNotes(e.target.files[0]); dom.importFile.value = ''; } });

    dom.wipeBtn.addEventListener('click', App.showWipeConfirm);

    dom.wipeInput.addEventListener('input', function () {
      dom.wipeConfirmBtn.disabled = dom.wipeInput.value !== 'DELETE';
    });

    dom.wipeConfirmBtn.addEventListener('click', function () {
      App.hideWipeConfirm();
      App.wipeRemoteRepo();
    });

    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'n') { e.preventDefault(); App.createNote(); }
      if (mod && e.key === 's') { e.preventDefault(); if (state.saveTimeout) { clearTimeout(state.saveTimeout); App.doAutoSave(); } }
      if (mod && e.shiftKey && e.key === 'P') { e.preventDefault(); if (state.activeNoteId) App.togglePin(state.activeNoteId); }
      if (mod && e.key === 'p') { e.preventDefault(); App.togglePreview(); }
      if (e.key === 'Escape' && state.activeNoteId) { App.showEmptyEditor(); }
    });

    window.addEventListener('resize', function () { if (window.innerWidth > 768) { App.closeSidebar(); } });
    window.addEventListener('hashchange', App.routeFromHash);
  };

  App.init();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
})();
