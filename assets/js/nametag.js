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

  var MODES = {
    full: {
      hint: 'In cả nền lẫn thông tin khách trong một lượt. Dùng khi in thẳng lên giấy trắng.',
      button: function (n) { return 'In tờ A4 (' + n + ' thẻ)'; }
    },
    template: {
      blank: true,
      hint: 'Phôi cho giấy trắng: in nền, logo, tiêu đề và QR, chừa trống chỗ ảnh và tên. ' +
            'In trước thành xấp phôi, sau đó chuyển sang “Chỉ nội dung” để in đè thông tin khách lên.',
      button: function (n) { return 'In phôi trắng (' + n + ' tờ)'; }
    },
    kraft: {
      blank: true,
      hint: 'Phôi cho giấy kraft: logo, tiêu đề, QR và viền chấm để cắt — bỏ hết nền vì giấy kraft đã là màu nền. ' +
            'Khung tròn cũng bỏ, nó nằm ở lượt in nội dung. Nhớ để Scale = 100% ở cả hai lượt.',
      button: function (n) { return 'In phôi kraft (' + n + ' tờ)'; }
    },
    content: {
      hint: 'Chỉ in ảnh (kèm khung tròn), tên và skill — không nền, không logo, không QR. ' +
            'Nạp xấp phôi đã in vào khay giấy rồi in đè. ' +
            'Trong hộp thoại in phải để Scale = 100% (đừng chọn “Fit to page”), nếu không sẽ lệch khỏi phôi.',
      button: function (n) { return 'In nội dung lên phôi (' + n + ' thẻ)'; }
    }
  };

  function isBlankMode() {
    return !!MODES[state.mode].blank;
  }

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
    imported: 0,
    mode: 'full',
    templateSheets: 5
  };

  var el = {};
  ['dropzone', 'photo-input', 'photo-label', 'photo-clear',
   'zoom', 'zoom-label', 'posx', 'posx-label', 'posy', 'posy-label',
   'name', 'skill', 'skill-chips', 'add-to-sheet', 'reset-form', 'status',
   'sheet-count', 'sheet-hint', 'sheet-list', 'clear-sheet',
   'import-guests', 'print-sheet', 'print-area', 'preview',
   'print-mode', 'mode-hint', 'template-qty', 'template-qty-field'
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
    /* The mode class lives on the wrapper so the preview shows exactly what
       will come off the printer — blank phôi, bare data, or the full card. */
    el.preview.className = 'sheet--' + state.mode;
    el.preview.innerHTML = NT.tagHTML(isBlankMode() ? {} : entry());
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

  /* Builds the pages that actually reach the printer. Template mode ignores
     the guest list entirely and lays down blank stock; the other two modes
     chunk the guests four to a sheet and differ only by the mode class. */
  function buildPrintArea() {
    var cls = 'sheet sheet--' + state.mode;
    var html = '';

    if (isBlankMode()) {
      var blanks = '';
      for (var b = 0; b < PER_PAGE; b++) blanks += NT.tagHTML({});
      for (var s = 0; s < state.templateSheets; s++) {
        html += '<div class="' + cls + '">' + blanks + '</div>';
      }
    } else {
      for (var start = 0; start < state.sheet.length; start += PER_PAGE) {
        html += '<div class="' + cls + '">' +
          state.sheet.slice(start, start + PER_PAGE).map(NT.tagHTML).join('') +
          '</div>';
      }
    }
    /* Built eagerly rather than on demand: window.print() fires before a
       deferred render would land, and Safari prints a stale document. */
    el['print-area'].innerHTML = html;
  }

  function renderSheet() {
    var count = state.sheet.length;
    var pages = Math.ceil(count / PER_PAGE);
    var blank = isBlankMode();

    el['sheet-count'].textContent = count;
    el['print-sheet'].textContent = MODES[state.mode].button(blank ? state.templateSheets : count);
    el['print-sheet'].disabled = blank ? state.templateSheets < 1 : count === 0;
    el['clear-sheet'].hidden = count === 0;

    el['sheet-hint'].textContent = count
      ? 'Xuất ' + pages + ' tờ — mỗi tờ 4 thẻ, cắt theo viền đứt.'
      : 'Chưa có thẻ nào. Nhập thông tin rồi bấm “Thêm vào tờ in”.';

    el['sheet-list'].innerHTML = state.sheet.map(function (item, index) {
      var skills = NT.formatSkills(item.skills);
      var label = (item.name || '[chưa tên]') + (skills ? ' · ' + skills : '');
      return '<li class="queue__item"><span>' + NT.esc(label) + '</span>' +
        '<button class="queue__remove" type="button" data-remove="' + index +
        '" aria-label="Bỏ ' + NT.esc(label) + ' khỏi tờ in">×</button></li>';
    }).join('');

    buildPrintArea();
    renderImportButton();
  }

  function renderMode() {
    [].forEach.call(el['print-mode'].querySelectorAll('[data-mode]'), function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    });
    el['mode-hint'].textContent = MODES[state.mode].hint;
    el['template-qty-field'].hidden = !isBlankMode();
  }

  el['print-mode'].addEventListener('click', function (event) {
    var button = event.target.closest('[data-mode]');
    if (!button || !MODES[button.dataset.mode]) return;
    state.mode = button.dataset.mode;
    renderMode();
    renderSheet();
    renderPreview();
  });

  el['template-qty'].addEventListener('input', function (event) {
    var qty = parseInt(event.target.value, 10);
    state.templateSheets = isFinite(qty) && qty > 0 ? Math.min(qty, 25) : 0;
    renderSheet();
  });

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
    if (isBlankMode() ? state.templateSheets < 1 : !state.sheet.length) return;
    window.print();
  });

  /* ── Boot ────────────────────────────────────────────── */

  renderChips();
  renderPhotoUI();
  renderMode();
  renderPreview();
  renderSheet();
})();
