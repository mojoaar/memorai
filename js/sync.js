window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;
  var dom = App.dom;
  var state = App.state;

  function repoAPI(path, method, body) {
    var s = state.settings;
    var url = 'https://api.github.com/repos/' + s.repo + '/contents' + path;
    var headers = {
      Authorization: 'Bearer ' + s.githubToken,
      Accept: 'application/vnd.github+json',
    };
    var opts = { method: method, headers: headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (e) {
          throw new Error(e.message || 'HTTP ' + r.status);
        });
      }
      if (r.status === 204) return null;
      return r.json();
    });
  }

  function btoaSafe(str) {
    var bytes = new TextEncoder().encode(str);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function atobSafe(str) {
    var binary = atob(str);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  App.noteToMD = function noteToMD(note) {
    var fm = '---\n';
    fm += 'id: ' + note.id + '\n';
    fm += 'title: "' + (note.title || '').replace(/"/g, '\\"') + '"\n';
    fm += 'tags: [' + (note.tags || []).map(function (t) { return '"' + t + '"'; }).join(', ') + ']\n';
    fm += 'pinned: ' + (note.pinned ? 'true' : 'false') + '\n';
    fm += 'created: ' + new Date(note.createdAt).toISOString() + '\n';
    fm += 'updated: ' + new Date(note.updatedAt).toISOString() + '\n';
    fm += '---\n\n';
    return fm + (note.content || '');
  }

  App.mdToNote = function mdToNote(md) {
    if (md.indexOf('---') !== 0) return null;
    var end = md.indexOf('---', 3);
    if (end === -1) return null;
    var fm = md.substring(3, end).trim();
    var body = md.substring(end + 3).trim();
    var note = { content: body, tags: [], pinned: false };
    fm.split('\n').forEach(function (line) {
      var idx = line.indexOf(':');
      if (idx === -1) return;
      var key = line.substring(0, idx).trim();
      var val = line.substring(idx + 1).trim();
      if (val.charAt(0) === '"') val = JSON.parse(val);
      if (key === 'id') note.id = val;
      else if (key === 'title') note.title = val;
      else if (key === 'tags') note.tags = JSON.parse(val.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false')) || [];
      else if (key === 'pinned') note.pinned = val === true || val === 'true';
      else if (key === 'created') note.createdAt = new Date(val).getTime();
      else if (key === 'updated') note.updatedAt = new Date(val).getTime();
    });
    if (!note.id) note.id = App.generateId();
    if (!note.createdAt) note.createdAt = Date.now();
    if (!note.updatedAt) note.updatedAt = Date.now();
    return note;
  }

  App.pushAllNotes = async function () {
    var s = state.settings;
    if (!s.githubToken || !s.repo) {
      App.toast('Set GitHub token and repository in Settings', 'error');
      return;
    }
    dom.syncLabel.textContent = 'Pushing...';
    dom.syncBtn.disabled = true;
    try {
      App.oneTimeMigration();

      // Build remote SHA map upfront — needed to PUT existing files without a stored _sha
      var remoteSHAs = {};
      var remoteFiles = [];
      try {
        var listing = await repoAPI('/notes?ref=' + s.branch, 'GET');
        if (Array.isArray(listing)) {
          remoteFiles = listing;
          listing.forEach(function (rf) {
            remoteSHAs[rf.name.replace('.md', '')] = rf.sha;
          });
        }
      } catch (e) { /* notes/ may not exist yet on an empty repo */ }

      for (var i = 0; i < state.notes.length; i++) {
        var note = state.notes[i];
        var md = App.noteToMD(note);
        var path = '/notes/' + note.id + '.md';
        var message = 'Update ' + (note.title || 'Untitled');
        var sha = remoteSHAs[note.id] || note._sha;
        var body = { message: message, content: btoaSafe(md), branch: s.branch };
        if (sha) body.sha = sha;
        var result = await repoAPI(path, 'PUT', body);
        if (result && result.content && result.content.sha) {
          note._sha = result.content.sha;
        }
      }

      // Delete remote notes that no longer exist locally — reuse listing from above
      try {
        if (remoteFiles.length > 0) {
          var localIds = new Set(state.notes.map(function (n) { return n.id; }));
          for (var j = 0; j < remoteFiles.length; j++) {
            var rf = remoteFiles[j];
            if (rf.type !== 'file') continue;
            var remoteId = rf.name.replace('.md', '');
            if (!localIds.has(remoteId)) {
              try {
                await repoAPI('/notes/' + rf.name, 'DELETE', { message: 'Delete ' + remoteId, sha: rf.sha, branch: s.branch });
              } catch (e) {
                console.warn('Failed to delete remote note:', rf.name, e);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Could not check remote deletions:', e);
      }

      App.pushAllImages().then(function () {
        App.saveNotes();
        dom.syncLabel.textContent = 'Sync with Repo';
        dom.syncBtn.disabled = false;
        App.toast('Pushed to repo!', 'success');
      });
    } catch (e) {
      dom.syncLabel.textContent = 'Sync with Repo';
      dom.syncBtn.disabled = false;
      App.toast('Push failed: ' + e.message, 'error');
    }
  };

  App.pushAllImages = async function () {
    var s = state.settings;
    if (!state.pendingImages.length) return;
    for (var i = 0; i < state.pendingImages.length; i++) {
      var img = state.pendingImages[i];
      if (img._pushed) continue;
      var base64 = img.dataUrl.split(',')[1];
      var path = '/images/' + img.filename;
      var body = { message: 'Add ' + img.filename, content: base64, branch: s.branch };
      try {
        await repoAPI(path, 'PUT', body);
        img._pushed = true;
      } catch (e) {
        console.warn('Image push failed:', img.filename, e);
      }
    }
    state.pendingImages = state.pendingImages.filter(function (img) { return !img._pushed; });
  };

  App.pullAllNotes = async function () {
    var s = state.settings;
    if (!s.githubToken || !s.repo) {
      App.toast('Set GitHub token and repository in Settings', 'error');
      return;
    }
    dom.syncLabel.textContent = 'Pulling...';
    dom.syncBtn.disabled = true;
    try {
      var files = await repoAPI('/notes?ref=' + s.branch, 'GET');
      if (!Array.isArray(files)) {
        dom.syncLabel.textContent = 'Sync with Repo';
        dom.syncBtn.disabled = false;
        App.toast('No notes found in repo', 'error');
        return;
      }
      var idMap = new Map(state.notes.map(function (n) { return [n.id, n]; }));
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        if (f.type !== 'file') continue;
        var fileData = await repoAPI('/notes/' + f.name + '?ref=' + s.branch, 'GET');
        if (!fileData || !fileData.content) continue;
        var md = atobSafe(fileData.content);
        var note = App.mdToNote(md);
        if (!note) continue;
        note._sha = fileData.sha;
        var existing = idMap.get(note.id);
        if (existing) {
          if (note.updatedAt > existing.updatedAt) {
            Object.assign(existing, note);
          }
        } else {
          state.notes.push(note);
        }
      }
      state.notes.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
      App.saveNotes();
      App.renderNotesList();
      App.updateNoteCount();
      if (state.activeNoteId && !state.notes.find(function (n) { return n.id === state.activeNoteId; })) {
        App.showEmptyEditor();
      }
      dom.syncLabel.textContent = 'Sync with Repo';
      dom.syncBtn.disabled = false;
      App.toast('Pulled from repo!', 'success');
    } catch (e) {
      dom.syncLabel.textContent = 'Sync with Repo';
      dom.syncBtn.disabled = false;
      App.toast('Pull failed: ' + e.message, 'error');
    }
  };

  App.handleSync = function () {
    var s = state.settings;
    App.saveSettings();
    if (s.repo && state.notes.length === 0) {
      App.pullAllNotes();
    } else {
      App.pushAllNotes();
    }
  };

  App.wipeRemoteRepo = async function () {
    var s = state.settings;
    if (!s.repo || !s.githubToken) {
      App.toast('Set GitHub token and repository first', 'error');
      return;
    }
    dom.syncLabel.textContent = 'Wiping...';
    dom.syncBtn.disabled = true;
    try {
      var notesList = await repoAPI('/notes?ref=' + s.branch, 'GET');
      if (Array.isArray(notesList)) {
        for (var i = 0; i < notesList.length; i++) {
          var f = notesList[i];
          if (f.type !== 'file') continue;
          try {
            await repoAPI('/notes/' + f.name, 'DELETE', { message: 'Wipe all data', sha: f.sha, branch: s.branch });
          } catch (e) {
            console.warn('Failed to delete note:', f.name, e);
          }
        }
      }
      try {
        var imgList = await repoAPI('/images?ref=' + s.branch, 'GET');
        if (Array.isArray(imgList)) {
          for (var j = 0; j < imgList.length; j++) {
            var fi = imgList[j];
            if (fi.type !== 'file') continue;
            try {
              await repoAPI('/images/' + fi.name, 'DELETE', { message: 'Wipe all data', sha: fi.sha, branch: s.branch });
            } catch (e) {
              console.warn('Failed to delete image:', fi.name, e);
            }
          }
        }
      } catch (e) { /* images/ may not exist */ }
      state.notes = [];
      state.pendingImages = [];
      state.activeNoteId = null;
      state.currentTags = [];
      App.saveNotes();
      App.showEmptyEditor();
      App.renderNotesList();
      App.updateNoteCount();
      App.toast('All remote and local data wiped', 'success');
    } catch (e) {
      App.toast('Wipe failed: ' + e.message, 'error');
    } finally {
      dom.syncLabel.textContent = 'Sync with Repo';
      dom.syncBtn.disabled = false;
    }
  };

  App.oneTimeMigration = function () {
    var migrated = false;
    state.notes.forEach(function (note) {
      var content = note.content || '';
      var re = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
      var match;
      while ((match = re.exec(content)) !== null) {
        migrated = true;
        var alt = match[1];
        var dataUrl = match[2];
        var filename = 'img-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6) + '.png';
        note.content = note.content.replace(match[0], '![' + alt + '](images/' + filename + ')');
        state.pendingImages.push({ filename: filename, dataUrl: dataUrl });
      }
    });
    if (migrated) {
      App.saveNotes();
    }
  };

  App.exportNotes = function () {
    var data = JSON.stringify(state.notes, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'memorai-notes-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Notes exported!', 'success');
  };

  App.importNotes = function (file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        var idMap = new Map(state.notes.map(function (n) { return [n.id, n]; }));
        imported.forEach(function (n) {
          if (!n.id) n.id = App.generateId();
          if (!Array.isArray(n.tags)) n.tags = [];
          n.updatedAt = Date.now();
          idMap.set(n.id, n);
        });
        state.notes = Array.from(idMap.values());
        state.notes.sort(function (a, b) {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.updatedAt - a.updatedAt;
        });
        App.saveNotes();
        App.renderNotesList();
        App.updateNoteCount();
        if (state.activeNoteId && !state.notes.find(function (n) { return n.id === state.activeNoteId; })) {
          App.showEmptyEditor();
        }
        App.toast('Imported ' + imported.length + ' note(s)!', 'success');
      } catch (err) {
        App.toast('Import failed: invalid file format', 'error');
      }
    };
    reader.readAsText(file);
  };
})();
