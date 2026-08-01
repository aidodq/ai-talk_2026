/* ============================================================
   tag-card.js — shared by checkin.html and nametag.html

   Three things live here because both tools need them:
     1. Photo intake  — read a File, downscale it, hand back a data URL.
     2. Tag markup    — the 84 x 124 mm name tag, built once.
     3. Guest store   — localStorage bridge from the upload page to
                        the print page (no backend on this site).
   ============================================================ */
(function (global) {
  'use strict';

  var STORE_KEY = 'aitalk2026.guests';
  /* A saved guest with a photo runs ~135 KB, so ~35 fill the usual 5 MB
     localStorage budget. The event caps at 20 seats; 30 leaves headroom
     without walking into a quota error. save() still guards the edge. */
  var STORE_MAX = 30;

  /* Facebook-style avatars come off phones at 3–4000 px. Anything
     past 720 is invisible at 40 mm on paper but blows the ~5 MB
     localStorage budget after three or four guests. */
  var PHOTO_MAX = 720;
  var PHOTO_QUALITY = 0.85;

  var SKILLS = ['AI', 'Backend', 'Frontend', 'Mobile', 'Data', 'Design'];
  var SKILL_SEP = ' | ';

  var QR_SRC = 'assets/img/qr-fanpage.png';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Skills are multi-select. They travel as an array but the text field
     shows them pipe-joined, so both shapes parse back to the same list.
     Only "|" and "," split — "AI/ML" has to survive as one skill. */
  function parseSkills(value) {
    var raw = Array.isArray(value) ? value : String(value == null ? '' : value).split(/[|,]/);
    var seen = {};
    return raw.map(function (skill) {
      return String(skill).trim();
    }).filter(function (skill) {
      if (!skill) return false;
      var key = skill.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function formatSkills(value) {
    return parseSkills(value).join(SKILL_SEP);
  }

  /* ── 1. Photo intake ─────────────────────────────────── */

  function readPhoto(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('Chưa chọn tệp.')); return; }
      if (!/^image\//.test(file.type)) { reject(new Error('Tệp không phải ảnh.')); return; }

      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Không đọc được tệp ảnh.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('Ảnh hỏng hoặc không hỗ trợ định dạng này.')); };
        img.onload = function () {
          var scale = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));

          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          /* White matte: JPEG has no alpha, and PNG uploads with a
             transparent background would otherwise come out black. */
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', PHOTO_QUALITY),
            name: file.name,
            width: w,
            height: h
          });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── 2. Tag markup ───────────────────────────────────── */

  /* The image sits on its own layer inside the ring so a print filter can
     be applied to the photo alone, without also washing out the border. */
  function photoStyle(entry) {
    if (!entry.photo) return '';
    return ' style="background-image:url(' + esc(entry.photo) + ');' +
      'background-size:' + (entry.zoom || 100) + '% auto;' +
      'background-position:' + (entry.posX || 0) + '% ' + (entry.posY || 0) + '%"';
  }

  /* One long display name (>18 chars) would overflow the tag at
     33u, so it steps down a size rather than wrapping to 3 lines. */
  function nameClass(name) {
    return name && name.length > 18 ? 'tag__name tag__name--long' : 'tag__name';
  }

  function tagHTML(entry) {
    entry = entry || {};
    var name = (entry.name || '').trim();
    var skill = formatSkills(entry.skills != null ? entry.skills : entry.skill);
    var blank = !name && !skill ? ' tag--empty' : '';
    var skillClass = skill.length > 26 ? 'tag__skill tag__skill--long' : 'tag__skill';

    return '' +
      '<div class="tag' + blank + '">' +
        '<div class="tag__glow" aria-hidden="true"></div>' +
        '<div class="tag__punch" aria-hidden="true"></div>' +
        '<div class="tag__head">' +
          '<div class="tag__logo">' +
            '<div class="tag__logo-a">AI<span>Do</span></div>' +
            '<div class="tag__logo-rule" aria-hidden="true"></div>' +
            '<div class="tag__logo-b">DUYÊN QUƠ</div>' +
          '</div>' +
          '<div class="tag__t1">AI &amp; Software Engineering</div>' +
          '<div class="tag__t2">From Footprints to Startup Reality</div>' +
        '</div>' +
        '<div class="tag__photo' + (entry.photo ? ' tag__photo--filled' : '') + '">' +
          '<div class="tag__photo-img"' + photoStyle(entry) + '></div>' +
          (entry.photo ? '' : '<span class="tag__photo-hint">Ảnh check-in</span>') +
        '</div>' +
        '<div class="tag__txt">' +
          '<div class="' + nameClass(name) + '">' + esc(name || '[Facebook Name]') + '</div>' +
          '<div class="' + skillClass + '">' + esc(skill || '[Skill chính]') + '</div>' +
        '</div>' +
        '<div class="tag__qr">' +
          /* If the QR file is missing the slot shows a labelled placeholder
             instead of a broken-image icon, so the tag stays printable and
             the code can be stuck on by hand. */
          '<div class="tag__qr-slot"><span>QR</span>' +
            '<img src="' + QR_SRC + '" alt="Mã QR Fanpage Duyên Quơ" onerror="this.remove()">' +
          '</div>' +
          '<div class="tag__qr-label">Fanpage<br>Duyên Quơ</div>' +
        '</div>' +
      '</div>';
  }

  /* ── 3. Guest store ──────────────────────────────────── */

  function load() {
    try {
      var raw = global.localStorage.getItem(STORE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];
      /* Guests saved before skills went multi-select carry a `skill`
         string; normalise on read so callers only deal with arrays. */
      return list.map(function (guest) {
        guest.skills = parseSkills(guest.skills != null ? guest.skills : guest.skill);
        delete guest.skill;
        return guest;
      });
    } catch (err) {
      return [];
    }
  }

  function save(list) {
    try {
      global.localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, STORE_MAX)));
      return true;
    } catch (err) {
      /* Quota exceeded — the caller surfaces this, it is not fatal:
         the tag on screen is still printable. */
      return false;
    }
  }

  function add(entry) {
    var list = load();
    list.push(entry);
    return save(list) ? list : null;
  }

  function removeAt(index) {
    var list = load();
    list.splice(index, 1);
    save(list);
    return list;
  }

  function clear() {
    try { global.localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    return [];
  }

  global.NameTag = {
    SKILLS: SKILLS,
    SKILL_SEP: SKILL_SEP,
    PHOTO_MAX: PHOTO_MAX,
    esc: esc,
    parseSkills: parseSkills,
    formatSkills: formatSkills,
    readPhoto: readPhoto,
    tagHTML: tagHTML,
    store: {
      key: STORE_KEY,
      max: STORE_MAX,
      load: load,
      save: save,
      add: add,
      removeAt: removeAt,
      clear: clear
    }
  };
})(window);
