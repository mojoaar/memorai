window.App = window.App || {};
(function () {
  'use strict';
  var App = window.App;

  App.STORE_NOTES = 'memorai_notes';
  App.STORE_SETTINGS = 'memorai_settings';
  App.VERSION = '0.1.6';

  App.DEFAULT_SETTINGS = {
    theme: 'catppuccin-mocha',
    timeFormat: '24h',
    noteDisplay: 'full',
    sortBy: 'modified',
    codeLineNumbers: true,
    githubToken: '',
    repo: '',
    branch: 'main',
  };

  App.LIGHT_THEMES = ['catppuccin-latte', 'nord-light', 'one-light', 'tokyo-night-light', 'dracula-light', 'github-light'];

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
    codeLineNumbersSelect: $('#codeLineNumbersSelect'),
    settingsVersion: $('#settingsVersion'),
  wipeBtn: $('#wipeBtn'),
  wipeConfirm: $('#wipeConfirm'),
  wipeInput: $('#wipeInput'),
  wipeConfirmBtn: $('#wipeConfirmBtn'),
  validateGithubBtn: $('#validateGithubBtn'),
  githubStatus: $('#githubStatus'),
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
