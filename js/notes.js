window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;
  var dom = App.dom;
  var state = App.state;

  App.createNote = function () {
    var note = {
      id: App.generateId(),
      title: '',
      content: '',
      tags: [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.notes.unshift(note);
    App.saveNotes();
    App.renderNotesList();
    App.updateNoteCount();
    App.openNote(note.id);
    if (window.innerWidth <= 768) App.closeSidebar();
    return note;
  };

  App.updateNote = function (id, updates) {
    var idx = state.notes.findIndex(function (n) { return n.id === id; });
    if (idx === -1) return;
    var note = state.notes[idx];
    var changed = ('title' in updates && updates.title !== note.title) ||
                  ('content' in updates && updates.content !== note.content);
    Object.assign(note, updates);
    if (changed) {
      note.updatedAt = Date.now();
      if (!note.pinned) {
        state.notes.splice(idx, 1);
        var insertIdx = state.notes.findIndex(function (n) { return !n.pinned; });
        state.notes.splice(insertIdx === -1 ? state.notes.length : insertIdx, 0, note);
      }
    }
    App.saveNotes();
  };

  App.deleteNote = function (id) {
    if (!confirm('Delete this note?')) return;
    state.notes = state.notes.filter(function (n) { return n.id !== id; });
    App.saveNotes();
    if (state.activeNoteId === id) {
      state.activeNoteId = null;
      App.showEmptyEditor();
    }
    App.renderNotesList();
    App.updateNoteCount();
    App.toast('Note deleted', 'info');
  };

  App.togglePin = function (id) {
    var note = state.notes.find(function (n) { return n.id === id; });
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = Date.now();
    state.notes.sort(function (a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
    App.saveNotes();
    App.renderNotesList();
    App.updatePinButton();
  };

  App.getActiveTags = function () {
    return state.currentTags.slice();
  };

  App.setActiveTags = function (tags) {
    state.currentTags = tags.slice();
    App.renderTagChips();
  };

  App.addTagFromInput = function () {
    var val = dom.noteTags.value.trim();
    if (!val) return;
    var parts = val.split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean);
    parts.forEach(function (tag) {
      if (state.currentTags.indexOf(tag) === -1) {
        state.currentTags.push(tag);
      }
    });
    dom.noteTags.value = '';
    App.renderTagChips();
    App.scheduleSave();
  };

  App.removeTag = function (tag) {
    state.currentTags = state.currentTags.filter(function (t) { return t !== tag; });
    App.renderTagChips();
    App.scheduleSave();
  };

  App.renderTagChips = function () {
    dom.tagsList.innerHTML = '';
    state.currentTags.forEach(function (tag) {
      var chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = App.escapeHtml(tag) + '<button class="tag-remove" data-tag="' + App.escapeHtml(tag) + '" aria-label="Remove tag ' + App.escapeHtml(tag) + '">&times;</button>';
      dom.tagsList.appendChild(chip);
    });
    dom.tagsList.querySelectorAll('.tag-remove').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        App.removeTag(btn.dataset.tag);
      });
    });
  };

  App.getAllTags = function () {
    var tagSet = {};
    state.notes.forEach(function (n) {
      (n.tags || []).forEach(function (t) {
        if (t) tagSet[t] = (tagSet[t] || 0) + 1;
      });
    });
    return Object.keys(tagSet).sort(function (a, b) {
      return tagSet[b] - tagSet[a];
    });
  };

  App.showSuggestions = function () {
    var val = dom.noteTags.value.trim().toLowerCase();
    if (!val) {
      dom.tagSuggestions.classList.add('hidden');
      state.suggestionIndex = -1;
      return;
    }
    var allTags = App.getAllTags();
    var available = allTags.filter(function (t) { return state.currentTags.indexOf(t) === -1; });
    var matches = available.filter(function (t) { return t.toLowerCase().indexOf(val) !== -1; });
    if (!matches.length) {
      dom.tagSuggestions.classList.add('hidden');
      state.suggestionIndex = -1;
      return;
    }
    state.suggestionIndex = -1;
    dom.tagSuggestions.innerHTML = matches.map(function (t, i) {
      return '<div class="tag-suggestion-item" data-index="' + i + '">' + App.escapeHtml(t) + '</div>';
    }).join('');
    dom.tagSuggestions.classList.remove('hidden');
    dom.tagSuggestions.querySelectorAll('.tag-suggestion-item').forEach(function (item) {
      item.addEventListener('click', function () {
        App.selectSuggestion(parseInt(item.dataset.index));
      });
    });
  };

  App.selectSuggestion = function (idx) {
    var items = dom.tagSuggestions.querySelectorAll('.tag-suggestion-item');
    if (idx < 0 || idx >= items.length) return;
    var tag = items[idx].textContent.trim().toLowerCase();
    if (state.currentTags.indexOf(tag) === -1) {
      state.currentTags.push(tag);
      App.renderTagChips();
      App.scheduleSave();
    }
    dom.noteTags.value = '';
    dom.tagSuggestions.classList.add('hidden');
    state.suggestionIndex = -1;
  };

  App.navigateSuggestions = function (dir) {
    var items = dom.tagSuggestions.querySelectorAll('.tag-suggestion-item');
    if (!items.length) return;
    items.forEach(function (el) { el.classList.remove('active'); });
    state.suggestionIndex += dir;
    if (state.suggestionIndex < 0) state.suggestionIndex = items.length - 1;
    if (state.suggestionIndex >= items.length) state.suggestionIndex = 0;
    items[state.suggestionIndex].classList.add('active');
    items[state.suggestionIndex].scrollIntoView({ block: 'nearest' });
  };

  App.tagsToHtml = function (tags) {
    if (!tags || !tags.length) return '';
    return '<div class="note-item-tags">' +
      tags.map(function (t) { return '<span class="note-item-tag">' + App.escapeHtml(t) + '</span>'; }).join('') +
      '</div>';
  };

  App.getSortedNotes = function () {
    var sorted = state.notes.slice();
    if (state.settings.sortBy === 'title') {
      sorted.sort(function (a, b) {
        var ta = (a.title || '').toLowerCase();
        var tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    } else if (state.settings.sortBy === 'created') {
      sorted.sort(function (a, b) { return b.createdAt - a.createdAt; });
    } else {
      sorted.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    }
    sorted.sort(function (a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
    return sorted;
  };
})();
