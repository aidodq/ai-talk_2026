/* ============================================================
   nametag.js — Bước 2: dựng thẻ tên và in A4, 4 thẻ mỗi tờ.
   Depends on tag-card.js (window.NameTag).
   ============================================================ */
(function () {
  'use strict';

  var NT = window.NameTag;
  var DEFAULTS = { zoom: 430, posX: 63, posY: 20 };
  var SHEET_MAX = 20;

  /* @page size cannot be toggled by a class, so it is swapped by rewriting
     a dedicated style element whenever the paper changes. */
  var PAPERS = {
    a4: {
      perPage: 4,
      css: '@page { size: A4 portrait; margin: 10mm; }',
      hint: '4 thẻ mỗi tờ. Giữa tờ có đường cắt chấm: in 2 thẻ hàng trên rồi cắt đôi là phát được ngay ' +
            'cho khách, nửa dưới còn nguyên để dành. Khi có thêm khách thì chuyển sang khổ A5 và in lên nửa đó.'
    },
    a5: {
      perPage: 2,
      css: '@page { size: 210mm 148.5mm; margin: 10mm; }',
      hint: '2 thẻ mỗi tờ — dùng cho nửa tờ A4 đã cắt. Nạp nửa giấy vào khay theo chiều ngang (cạnh 210mm ' +
            'nằm ngang). Thẻ rơi đúng vị trí như khi in trên A4, không lệch.'
    }
  };

  var pageStyle = document.createElement('style');
  document.head.appendChild(pageStyle);

  function perPage() {
    return PAPERS[state.paperSize].perPage;
  }

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

  /* Photo treatments. Kraft is a dark, absorbent stock: the paper is the
     brightest thing the print can ever be, so highlights vanish and the
     whole image sits low. Each preset trades some fidelity for separation. */
  var TREATMENTS = {
    none: {
      base: '',
      contrast: 100,
      hint: 'Ảnh giữ nguyên màu. Trên kraft sẽ hơi tối và ngả nâu vì giấy nâu ăn hết vùng sáng.'
    },
    punch: {
      base: 'saturate(1.2) brightness(1.12)',
      contrast: 130,
      hint: 'Đẩy sáng và tăng độ rực để bù phần bị giấy nâu nuốt. Hợp với ảnh chân dung chụp đủ sáng.'
    },
    mono: {
      base: 'grayscale(1) brightness(1.15)',
      contrast: 145,
      hint: 'Chuyển đơn sắc rồi ép tương phản — ảnh đọc như bản in lụa trên kraft. An toàn nhất khi ảnh gốc bị ngược sáng.'
    }
  };

  function photoFilter() {
    if (!state.kraftInk) return 'none';
    var treat = TREATMENTS[state.treat];
    return (treat.base ? treat.base + ' ' : '') + 'contrast(' + state.photoContrast + '%)';
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
    paperSize: 'a4',
    templateSheets: 5,
    kraftInk: false,
    paper: '#C4A484',
    treat: 'none',
    photoContrast: 100
  };

  var el = {};
  ['dropzone', 'photo-input', 'photo-label', 'photo-clear',
   'zoom', 'zoom-label', 'posx', 'posx-label', 'posy', 'posy-label',
   'name', 'skill', 'skill-chips', 'add-to-sheet', 'reset-form', 'status',
   'sheet-count', 'sheet-hint', 'sheet-list', 'clear-sheet',
   'import-guests', 'print-sheet', 'print-area', 'preview',
   'print-mode', 'mode-hint', 'template-qty', 'template-qty-field',
   'paper-size', 'paper-hint', 'per-page',
   'kraft-ink', 'kraft-ink-controls', 'paper-colour', 'photo-treat', 'treat-hint',
   'photo-contrast', 'photo-contrast-label'
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
    el.preview.className = 'sheet--' + state.mode + (state.kraftInk ? ' is-kraft-ink' : '');
    el.preview.style.setProperty('--paper', state.paper);
    el.preview.style.setProperty('--photo-filter', photoFilter());
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
    var cls = 'sheet sheet--' + state.mode + (state.kraftInk ? ' is-kraft-ink' : '');
    var per = perPage();
    /* Only the full A4 gets a cut guide; an A5 half is already cut. */
    var cut = state.paperSize === 'a4'
      ? '<div class="sheet__cut" aria-hidden="true"><span>&#9986; CẮT ĐÔI THÀNH 2 TỜ A5</span></div>'
      : '';
    var html = '';

    /* Ink compensation must reach the printer, so it rides on the print
       area itself — unlike the --paper simulation, which is preview-only. */
    el['print-area'].style.setProperty('--photo-filter', photoFilter());

    if (isBlankMode()) {
      var blanks = '';
      for (var b = 0; b < per; b++) blanks += NT.tagHTML({});
      for (var s = 0; s < state.templateSheets; s++) {
        html += '<div class="' + cls + '">' + cut + blanks + '</div>';
      }
    } else {
      for (var start = 0; start < state.sheet.length; start += per) {
        html += '<div class="' + cls + '">' + cut +
          state.sheet.slice(start, start + per).map(NT.tagHTML).join('') +
          '</div>';
      }
    }
    /* Built eagerly rather than on demand: window.print() fires before a
       deferred render would land, and Safari prints a stale document. */
    el['print-area'].innerHTML = html;
  }

  function renderSheet() {
    var count = state.sheet.length;
    var pages = Math.ceil(count / perPage());
    var blank = isBlankMode();

    el['sheet-count'].textContent = count;
    el['print-sheet'].textContent = MODES[state.mode].button(blank ? state.templateSheets : count);
    el['print-sheet'].disabled = blank ? state.templateSheets < 1 : count === 0;
    el['clear-sheet'].hidden = count === 0;

    el['sheet-hint'].textContent = count
      ? 'Xuất ' + pages + ' tờ ' + (state.paperSize === 'a4' ? 'A4' : 'A5') +
        ' — mỗi tờ ' + perPage() + ' thẻ, cắt theo viền chấm.'
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

  function renderKraftInk() {
    el['kraft-ink'].checked = state.kraftInk;
    el['kraft-ink-controls'].hidden = !state.kraftInk;
    el['paper-colour'].value = state.paper;
    el['photo-contrast'].value = state.photoContrast;
    el['photo-contrast-label'].textContent = state.photoContrast + '%';
    el['treat-hint'].textContent = TREATMENTS[state.treat].hint;
    [].forEach.call(el['photo-treat'].querySelectorAll('[data-treat]'), function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.treat === state.treat));
    });
  }

  function refreshInk() {
    renderKraftInk();
    renderSheet();
    renderPreview();
  }

  function renderPaper() {
    pageStyle.textContent = PAPERS[state.paperSize].css;
    el['paper-hint'].textContent = PAPERS[state.paperSize].hint;
    el['per-page'].textContent = perPage();
    [].forEach.call(el['paper-size'].querySelectorAll('[data-paper]'), function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.paper === state.paperSize));
    });
  }

  el['paper-size'].addEventListener('click', function (event) {
    var button = event.target.closest('[data-paper]');
    if (!button || !PAPERS[button.dataset.paper]) return;
    state.paperSize = button.dataset.paper;
    renderPaper();
    renderSheet();
  });

  el['print-mode'].addEventListener('click', function (event) {
    var button = event.target.closest('[data-mode]');
    if (!button || !MODES[button.dataset.mode]) return;
    state.mode = button.dataset.mode;
    /* Picking the kraft phôi implies kraft stock; switching back to the
       white-paper phôi implies it is no longer needed. The content pass is
       left alone — it can be aimed at either stock. */
    if (state.mode === 'kraft') state.kraftInk = true;
    else if (state.mode === 'template') state.kraftInk = false;
    renderMode();
    refreshInk();
  });

  el['kraft-ink'].addEventListener('change', function (event) {
    state.kraftInk = event.target.checked;
    refreshInk();
  });

  el['paper-colour'].addEventListener('input', function (event) {
    state.paper = event.target.value;
    renderPreview();
  });

  el['photo-contrast'].addEventListener('input', function (event) {
    state.photoContrast = Number(event.target.value);
    refreshInk();
  });

  el['photo-treat'].addEventListener('click', function (event) {
    var button = event.target.closest('[data-treat]');
    if (!button || !TREATMENTS[button.dataset.treat]) return;
    state.treat = button.dataset.treat;
    state.photoContrast = TREATMENTS[state.treat].contrast;
    refreshInk();
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
  renderPaper();
  renderMode();
  renderKraftInk();
  renderPreview();
  renderSheet();
})();
