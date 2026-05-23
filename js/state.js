window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;

  App.STORE_NOTES = 'memorai_notes';
  App.STORE_SETTINGS = 'memorai_settings';
  App.VERSION = '0.1.0';

  App.DEFAULT_SETTINGS = {
    theme: 'catppuccin-dark',
    timeFormat: '24h',
    noteDisplay: 'full',
    sortBy: 'modified',
    githubToken: '',
    repo: '',
    branch: 'main',
  };

  function $(sel) { return document.querySelector(sel); }

  App.dom = {
    sidebar: $('#sidebar'),
    sidebarToggle: $('#sidebarToggle'),
    notesList: $('#notesList'),
    newNoteBtn: $('#newNoteBtn'),
    searchInput: $('#searchInput'),
    editorEmpty: $('#editorEmpty'),
    editorContent: $('#editorContent'),
    noteTitle: $('#noteTitle'),
    noteTags: $('#noteTags'),
    tagsList: $('#tagsList'),
    tagSuggestions: $('#tagSuggestions'),
    noteContent: $('#noteContent'),
    notePreview: $('#notePreview'),
    editBtn: $('#editBtn'),
    previewBtn: $('#previewBtn'),
    lastModified: $('#lastModified'),
    backBtn: $('#backBtn'),
    pinBtn: $('#pinBtn'),
    deleteBtn: $('#deleteBtn'),
    shareBtn: $('#shareBtn'),
    exportMdBtn: $('#exportMdBtn'),
    imageBtn: $('#imageBtn'),
    imageFile: $('#imageFile'),
    iconBtn: $('#iconBtn'),
    iconPicker: $('#iconPicker'),
    iconSearchInput: $('#iconSearchInput'),
    iconPickerGrid: $('#iconPickerGrid'),
    themeToggle: $('#themeToggle'),
    settingsToggle: $('#settingsToggle'),
    settingsModal: $('#settingsModal'),
    settingsClose: $('#settingsClose'),
    githubToken: $('#githubToken'),
    repoInput: $('#repoInput'),
    branchInput: $('#branchInput'),
    syncBtn: $('#syncBtn'),
    syncLabel: $('#syncLabel'),
    exportBtn: $('#exportBtn'),
    importBtn: $('#importBtn'),
    importFile: $('#importFile'),
    noteCount: $('#noteCount'),
    toastContainer: $('#toastContainer'),
    themeSelect: $('#themeSelect'),
    timeFormatSelect: $('#timeFormatSelect'),
    noteDisplaySelect: $('#noteDisplaySelect'),
    sortBySelect: $('#sortBySelect'),
    settingsVersion: $('#settingsVersion'),
    wipeBtn: $('#wipeBtn'),
    wipeConfirm: $('#wipeConfirm'),
    wipeInput: $('#wipeInput'),
    wipeConfirmBtn: $('#wipeConfirmBtn'),
  };

  App.state = {
    notes: [],
    settings: JSON.parse(JSON.stringify(App.DEFAULT_SETTINGS)),
    activeNoteId: null,
    saveTimeout: null,
    sidebarBackdrop: null,
    isPreview: false,
    suggestionIndex: -1,
    currentTags: [],
    pendingImages: [],
    hasServerConfig: false,
  };
})();
