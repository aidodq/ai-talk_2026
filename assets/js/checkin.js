/* ============================================================
   checkin.js — Bước 1: tải ảnh, căn khung tròn, lưu khách mời.
   Depends on tag-card.js (window.NameTag).
   ============================================================ */
(function () {
  'use strict';

  var NT = window.NameTag;
  var DEFAULTS = { zoom: 430, posX: 63, posY: 20 };

  var state = {
    photo: null,
    photoName: '',
    zoom: DEFAULTS.zoom,
    posX: DEFAULTS.posX,
    posY: DEFAULTS.posY,
    name: '',
    skills: []
  };

  var el = {};
  ['dropzone', 'photo-input', 'photo-label', 'photo-clear', 'photo-reset', 'photo-download',
   'zoom', 'zoom-label', 'posx', 'posx-label', 'posy', 'posy-label',
   'name', 'skill', 'skill-chips', 'save-guest', 'reset-form', 'status',
   'guest-count', 'guest-list', 'clear-guests', 'list-hint', 'preview'
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

  /* ── Preview ─────────────────────────────────────────── */

  function renderPreview() {
    el.preview.innerHTML = NT.tagHTML(entry());
  }

  function renderPhotoUI() {
    el['photo-label'].textContent = state.photoName ||
      'Chưa có ảnh — kéo thả ảnh vào đây cũng được. Thẻ vẫn in được để dán ảnh sau.';
    el['photo-clear'].hidden = !state.photo;
    el['photo-download'].disabled = !state.photo;
    el['zoom-label'].textContent = state.zoom + '%';
    el['posx-label'].textContent = state.posX + '%';
    el['posy-label'].textContent = state.posY + '%';
  }

  /* ── Skill chips ─────────────────────────────────────── */

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

  el['skill-chips'].addEventListener('click', function (event) {
    var button = event.target.closest('[data-skill]');
    if (!button) return;
    var skill = button.dataset.skill;
    var key = skill.toLowerCase();

    state.skills = hasSkill(skill)
      ? state.skills.filter(function (s) { return s.toLowerCase() !== key; })
      : state.skills.concat([skill]);

    /* Chips own the field when clicked; typing does not get rewritten
       under the caret (see the input handler below). */
    el.skill.value = NT.formatSkills(state.skills);
    renderChips();
    renderPreview();
  });

  /* ── Guest list ──────────────────────────────────────── */

  function renderGuests() {
    var guests = NT.store.load();
    el['guest-count'].textContent = guests.length;
    el['clear-guests'].hidden = guests.length === 0;
    el['list-hint'].textContent = guests.length
      ? 'Danh sách lưu trong trình duyệt này. Mở Name Tag Studio trên cùng máy để nạp vào tờ in.'
      : 'Chưa lưu khách nào. Nhập thông tin rồi bấm “Lưu vào danh sách khách”.';

    el['guest-list'].innerHTML = guests.map(function (guest, index) {
      var skills = NT.formatSkills(guest.skills);
      var label = (guest.name || '[chưa tên]') + (skills ? ' · ' + skills : '');
      return '<li class="queue__item"><span>' + NT.esc(label) + '</span>' +
        '<button class="queue__remove" type="button" data-remove="' + index +
        '" aria-label="Xoá ' + NT.esc(label) + '">×</button></li>';
    }).join('');
  }

  el['guest-list'].addEventListener('click', function (event) {
    var button = event.target.closest('[data-remove]');
    if (!button) return;
    NT.store.removeAt(Number(button.dataset.remove));
    renderGuests();
  });

  el['clear-guests'].addEventListener('click', function () {
    if (!window.confirm('Xoá toàn bộ danh sách khách đã lưu trên máy này?')) return;
    NT.store.clear();
    renderGuests();
    say('Đã xoá danh sách khách.');
  });

  /* ── Photo intake ────────────────────────────────────── */

  function acceptFile(file) {
    NT.readPhoto(file).then(function (photo) {
      state.photo = photo.dataUrl;
      state.photoName = photo.name + ' · ' + photo.width + '×' + photo.height;
      renderPhotoUI();
      renderPreview();
      say('Đã tải ảnh. Chỉnh zoom và vị trí cho khuôn mặt vào giữa khung tròn.');
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

  el['photo-reset'].addEventListener('click', function () {
    state.zoom = DEFAULTS.zoom;
    state.posX = DEFAULTS.posX;
    state.posY = DEFAULTS.posY;
    el.zoom.value = state.zoom;
    el.posx.value = state.posX;
    el.posy.value = state.posY;
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

  /* ── Save / reset ────────────────────────────────────── */

  el['save-guest'].addEventListener('click', function () {
    var guest = entry();
    if (!guest.name) { say('Nhập Facebook Name trước khi lưu.', true); el.name.focus(); return; }

    var guests = NT.store.load();
    if (guests.length >= NT.store.max) {
      say('Danh sách đã đủ ' + NT.store.max + ' khách — xoá bớt trước khi lưu thêm.', true);
      return;
    }
    if (!NT.store.add(guest)) {
      say('Bộ nhớ trình duyệt đã đầy. Xoá bớt khách đã lưu rồi thử lại.', true);
      return;
    }
    renderGuests();
    say('Đã lưu “' + guest.name + '”. Sang Name Tag Studio để nạp vào tờ in.');
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

  /* ── Download the circular crop ──────────────────────── */
  /* Mirrors the CSS box exactly: `background-size: zoom% auto` is a
     width percentage of the circle, and `background-position: x% y%`
     aligns the same fraction of the overflow on each axis. */

  el['photo-download'].addEventListener('click', function () {
    if (!state.photo) return;

    var SIZE = 720;
    var img = new Image();
    img.onerror = function () { say('Không dựng được ảnh để tải về.', true); };
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      var ctx = canvas.getContext('2d');

      ctx.save();
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      var w = SIZE * (state.zoom / 100);
      var h = w * (img.height / img.width);
      var x = (SIZE - w) * (state.posX / 100);
      var y = (SIZE - h) * (state.posY / 100);
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();

      var link = document.createElement('a');
      var slug = (state.name.trim() || 'check-in')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '').toLowerCase() || 'check-in';
      link.download = slug + '-checkin.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      say('Đã tải ảnh tròn ' + SIZE + '×' + SIZE + ' px.');
    };
    img.src = state.photo;
  });

  /* ── Boot ────────────────────────────────────────────── */

  renderChips();
  renderPhotoUI();
  renderPreview();
  renderGuests();
})();
