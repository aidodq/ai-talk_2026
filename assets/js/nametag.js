/* ============================================================
   nametag.js — Bước 2: dựng thẻ tên và in A4, 4 thẻ mỗi tờ.
   Depends on tag-card.js (window.NameTag).
   ============================================================ */
(function () {
  'use strict';

  var NT = window.NameTag;
  var DEFAULTS = { zoom: 430, posX: 63, posY: 20 };
  var SHEET_MAX = 20;
  var PER_PAGE = 4;

  var state = {
    photo: null,
    photoName: '',
    zoom: DEFAULTS.zoom,
    posX: DEFAULTS.posX,
    posY: DEFAULTS.posY,
    name: '',
    skills: [],
    sheet: [],
    /* How far into the saved-guest list we have already pulled, so a second
       press imports only the newly-saved ones instead of duplicating. */
    imported: 0
  };

  var el = {};
  ['dropzone', 'photo-input', 'photo-label', 'photo-clear',
   'zoom', 'zoom-label', 'posx', 'posx-label', 'posy', 'posy-label',
   'name', 'skill', 'skill-chips', 'add-to-sheet', 'reset-form', 'status',
   'sheet-count', 'sheet-count-top', 'sheet-hint', 'sheet-list', 'clear-sheet',
   'import-guests', 'print-sheet', 'print-area', 'preview'
  ].forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  var statusTimer = null;

  function say(message, warn) {
    el.status.textContent = message;
    el.status.className = warn ? 'status status--warn' : 'status';
    clearTimeout(statusTimer);
    if (message) statusTimer = setTimeout(function () { el.status.textContent = ''; }, 6000);
  }

  function entry() {
    return {
      photo: state.photo,
      zoom: state.zoom,
      posX: state.posX,
      posY: state.posY,
      name: state.name.trim(),
      skills: state.skills.slice()
    };
  }

  /* ── Render ──────────────────────────────────────────── */

  function renderPreview() {
    el.preview.innerHTML = NT.tagHTML(entry());
  }

  function renderPhotoUI() {
    el['photo-label'].textContent = state.photoName ||
      'Chưa có ảnh — thẻ vẫn in được để dán ảnh sau.';
    el['photo-clear'].hidden = !state.photo;
    el['zoom-label'].textContent = state.zoom + '%';
    el['posx-label'].textContent = state.posX + '%';
    el['posy-label'].textContent = state.posY + '%';
  }

  function hasSkill(skill) {
    var key = skill.toLowerCase();
    return state.skills.some(function (s) { return s.toLowerCase() === key; });
  }

  function renderChips() {
    el['skill-chips'].innerHTML = NT.SKILLS.map(function (skill) {
      return '<button class="chip" type="button" aria-pressed="' + hasSkill(skill) +
        '" data-skill="' + NT.esc(skill) + '">' + NT.esc(skill) + '</button>';
    }).join('');
  }

  function renderSheet() {
    var count = state.sheet.length;
    var pages = Math.ceil(count / PER_PAGE);

    el['sheet-count'].textContent = count;
    el['sheet-count-top'].textContent = count;
    el['print-sheet'].disabled = count === 0;
    el['clear-sheet'].hidden = count === 0;

    el['sheet-hint'].textContent = count
      ? 'Bấm “In tờ A4” để xuất ' + pages + ' tờ — mỗi tờ 4 thẻ, cắt theo viền đứt.'
      : 'Chưa có thẻ nào. Nhập thông tin rồi bấm “Thêm vào tờ in”.';

    el['sheet-list'].innerHTML = state.sheet.map(function (item, index) {
      var skills = NT.formatSkills(item.skills);
      var label = (item.name || '[chưa tên]') + (skills ? ' · ' + skills : '');
      return '<li class="queue__item"><span>' + NT.esc(label) + '</span>' +
        '<button class="queue__remove" type="button" data-remove="' + index +
        '" aria-label="Bỏ ' + NT.esc(label) + ' khỏi tờ in">×</button></li>';
    }).join('');

    /* Rebuild the printable DOM eagerly: window.print() fires before a
       deferred render would land, and Safari prints a stale document. */
    var html = '';
    for (var start = 0; start < count; start += PER_PAGE) {
      html += '<div class="sheet">' +
        state.sheet.slice(start, start + PER_PAGE).map(NT.tagHTML).join('') +
        '</div>';
    }
    el['print-area'].innerHTML = html;

    renderImportButton();
  }

  function renderImportButton() {
    var pending = Math.max(0, NT.store.load().length - state.imported);
    var room = SHEET_MAX - state.sheet.length;
    el['import-guests'].hidden = pending === 0 || room <= 0;
    el['import-guests'].textContent = 'Nạp ' + Math.min(pending, room) +
      ' khách từ trang Upload ảnh';
  }

  /* The upload page may be open in another tab; this keeps the button's
     count honest as guests are saved over there. */
  window.addEventListener('storage', function (event) {
    if (event.key === NT.store.key) renderImportButton();
  });

  /* ── Photo intake ────────────────────────────────────── */

  function acceptFile(file) {
    NT.readPhoto(file).then(function (photo) {
      state.photo = photo.dataUrl;
      state.photoName = photo.name + ' · ' + photo.width + '×' + photo.height;
      renderPhotoUI();
      renderPreview();
    }).catch(function (error) {
      say(error.message, true);
    });
  }

  el['photo-input'].addEventListener('change', function (event) {
    var file = event.target.files && event.target.files[0];
    if (file) acceptFile(file);
    event.target.value = '';
  });

  ['dragenter', 'dragover'].forEach(function (type) {
    el.dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      el.dropzone.classList.add('is-over');
    });
  });
  ['dragleave', 'drop'].forEach(function (type) {
    el.dropzone.addEventListener(type, function (event) {
      event.preventDefault();
      el.dropzone.classList.remove('is-over');
    });
  });
  el.dropzone.addEventListener('drop', function (event) {
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) acceptFile(file);
  });

  el['photo-clear'].addEventListener('click', function () {
    state.photo = null;
    state.photoName = '';
    renderPhotoUI();
    renderPreview();
  });

  /* ── Sliders & text ──────────────────────────────────── */

  [['zoom', 'zoom'], ['posx', 'posX'], ['posy', 'posY']].forEach(function (pair) {
    el[pair[0]].addEventListener('input', function (event) {
      state[pair[1]] = Number(event.target.value);
      renderPhotoUI();
      renderPreview();
    });
  });

  el.name.addEventListener('input', function (event) {
    state.name = event.target.value;
    renderPreview();
  });

  /* Parse but never write back — reformatting mid-keystroke would jump
     the caret and eat the separator the user is still typing. */
  el.skill.addEventListener('input', function (event) {
    state.skills = NT.parseSkills(event.target.value);
    renderChips();
    renderPreview();
  });

  el['skill-chips'].addEventListener('click', function (event) {
    var button = event.target.closest('[data-skill]');
    if (!button) return;
    var skill = button.dataset.skill;
    var key = skill.toLowerCase();

    state.skills = hasSkill(skill)
      ? state.skills.filter(function (s) { return s.toLowerCase() !== key; })
      : state.skills.concat([skill]);

    el.skill.value = NT.formatSkills(state.skills);
    renderChips();
    renderPreview();
  });

  /* ── Sheet actions ───────────────────────────────────── */

  el['add-to-sheet'].addEventListener('click', function () {
    if (state.sheet.length >= SHEET_MAX) {
      say('Tờ in đã đủ ' + SHEET_MAX + ' thẻ. In đợt này rồi xoá hết để làm tiếp.', true);
      return;
    }
    var item = entry();
    if (!item.name) { say('Nhập Facebook Name trước khi thêm vào tờ in.', true); el.name.focus(); return; }

    state.sheet.push(item);
    renderSheet();
    say('Đã thêm “' + item.name + '” vào tờ in.');
  });

  el['sheet-list'].addEventListener('click', function (event) {
    var button = event.target.closest('[data-remove]');
    if (!button) return;
    state.sheet.splice(Number(button.dataset.remove), 1);
    renderSheet();
  });

  el['clear-sheet'].addEventListener('click', function () {
    if (!window.confirm('Xoá toàn bộ thẻ trong tờ in?')) return;
    state.sheet = [];
    state.imported = 0;   // starting over — the saved guests are importable again
    renderSheet();
  });

  el['reset-form'].addEventListener('click', function () {
    state.name = '';
    state.skills = [];
    state.photo = null;
    state.photoName = '';
    el.name.value = '';
    el.skill.value = '';
    renderChips();
    renderPhotoUI();
    renderPreview();
  });

  el['import-guests'].addEventListener('click', function () {
    var guests = NT.store.load();
    var room = SHEET_MAX - state.sheet.length;
    var pending = guests.length - state.imported;
    if (pending <= 0 || room <= 0) return;

    var taken = guests.slice(state.imported, state.imported + room);
    state.imported += taken.length;
    state.sheet = state.sheet.concat(taken);
    renderSheet();
    say('Đã nạp ' + taken.length + ' khách từ trang Upload ảnh.' +
      (pending > taken.length ? ' Còn ' + (pending - taken.length) + ' khách chưa nạp — tờ in đã đầy.' : ''));
  });

  el['print-sheet'].addEventListener('click', function () {
    if (!state.sheet.length) return;
    window.print();
  });

  /* ── Boot ────────────────────────────────────────────── */

  renderChips();
  renderPhotoUI();
  renderPreview();
  renderSheet();
})();
