/* =========================================================================
   AI & Software Engineering — Event Landing
   Progressive enhancement only: every section is usable with JS disabled.
   ========================================================================= */
(function () {
  'use strict';

  window.__landingReady = true;   // disarms the failsafe in index.html

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- nav */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');

  // --header-h drives both the drawer's offset and scroll-padding for anchors.
  // The CSS value is a fallback; measure the real bar so both stay exact when
  // the brand wraps or the font loads late.
  if (header) {
    var syncHeaderHeight = function () {
      document.documentElement.style.setProperty('--header-h', Math.round(header.offsetHeight) + 'px');
    };
    syncHeaderHeight();
    if ('ResizeObserver' in window) new ResizeObserver(syncHeaderHeight).observe(header);
    else window.addEventListener('resize', syncHeaderHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeaderHeight);
  }

  function closeNav() {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeNav();
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });

    // The drawer only exists below 900px — drop it if the viewport grows.
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) {
      if (m.matches) closeNav();
    });
  }

  /* -------------------------------------------------------- scroll spy */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.site-nav a[href^="#"]:not(.btn)')
  );
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + entry.target.id;
          if (on) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------------------ reveal */
  var revealables = document.querySelectorAll('[data-reveal]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var reveal = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    revealables.forEach(function (el) { reveal.observe(el); });
  }

  /* --------------------------------------------- missing-image styling */
  // Photos live in assets/img/. If one has not been dropped in yet, hide the
  // broken icon and let the wrapper's placeholder styling take over.
  document.querySelectorAll('img').forEach(function (img) {
    var mark = function () {
      img.classList.add('is-broken');
      if (img.parentElement) img.parentElement.classList.add('is-missing');
    };
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener('error', mark);
  });

  /* --------------------------------------------------------- countdown */
  var DEADLINE = new Date('2026-08-01T17:00:00+07:00').getTime();
  var countdownEl = document.getElementById('countdown');

  function renderCountdown() {
    if (!countdownEl) return;
    var left = DEADLINE - Date.now();

    if (left <= 0) {
      countdownEl.textContent = 'Đã hết hạn nhận hồ sơ — liên hệ BTC qua Zalo nếu bạn vẫn muốn tham dự.';
      countdownEl.hidden = false;
      return;
    }

    var days = Math.floor(left / 86400000);
    var hours = Math.floor(left / 3600000) % 24;
    var mins = Math.floor(left / 60000) % 60;

    countdownEl.textContent = days > 0
      ? 'Còn ' + days + ' ngày ' + hours + ' giờ để gửi hồ sơ.'
      : 'Còn ' + hours + ' giờ ' + mins + ' phút để gửi hồ sơ.';
    countdownEl.hidden = false;
  }

  renderCountdown();
  setInterval(renderCountdown, 60000);

  /* -------------------------------------------------------------- form */
  var form = document.getElementById('reg-form');
  if (!form) return;

  var status = document.getElementById('reg-status');
  var submitBtn = form.querySelector('button[type="submit"]');

  var RULES = [
    {
      name: 'fullname',
      errorId: 'fullname-error',
      test: function (v) { return v.trim().length >= 2; },
      message: 'Vui lòng nhập họ và tên của bạn.'
    },
    {
      name: 'phone',
      errorId: 'phone-error',
      test: function (v) { return /^[0-9+\s().-]{9,15}$/.test(v.trim()); },
      message: 'Số điện thoại chưa hợp lệ — BTC gửi vé mời qua Zalo số này.'
    },
    {
      name: 'email',
      errorId: 'email-error',
      test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
      message: 'Email chưa hợp lệ, bạn kiểm tra lại giúp BTC nhé.'
    },
    {
      name: 'org',
      errorId: 'org-error',
      test: function (v) { return v.trim().length >= 2; },
      message: 'Nhập trường ĐH hoặc nơi bạn đang làm việc.'
    },
    {
      name: 'level',
      errorId: 'level-error',
      group: true,
      test: function () {
        var picked = form.querySelector('input[name="level"]:checked');
        if (!picked) return false;
        // "Khác" maps to the Google Form's other-option, which needs its own text.
        if (picked.value !== '__other_option__') return true;
        return (form.elements['level-other'].value || '').trim().length >= 2;
      },
      message: 'Chọn trình độ hiện tại — nếu chọn "Khác" thì ghi rõ giúp BTC.'
    },
    {
      name: 'aitools',
      errorId: 'aitools-error',
      test: function (v) { return v.trim().length >= 2; },
      message: 'Kể ngắn gọn giúp BTC — chưa dùng AI bao giờ thì ghi "chưa" cũng được.'
    },
    {
      name: 'goals',
      errorId: 'goals-error',
      group: true,
      test: function () { return !!form.querySelector('input[name="goals"]:checked'); },
      message: 'Chọn ít nhất một mục tiêu bạn mong đợi.'
    }
  ];

  // "Khác" reveals its own free-text box.
  var levelOther = form.elements['level-other'];
  form.querySelectorAll('input[name="level"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var isOther = radio.checked && radio.value === '__other_option__';
      levelOther.hidden = !isOther;
      if (isOther) levelOther.focus();
    });
  });
  levelOther.addEventListener('input', function () {
    var rule = RULES.filter(function (r) { return r.name === 'level'; })[0];
    if (rule.test()) setError(rule, '');
  });

  function setError(rule, message) {
    var errorEl = document.getElementById(rule.errorId);
    var field = form.elements[rule.name];
    var control = rule.group ? null : field;

    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
    }
    if (control && control.setAttribute) {
      if (message) {
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('aria-describedby', rule.errorId);
      } else {
        control.removeAttribute('aria-invalid');
        control.removeAttribute('aria-describedby');
      }
    }
  }

  function validate() {
    var firstInvalid = null;

    RULES.forEach(function (rule) {
      var value = rule.group ? '' : (form.elements[rule.name].value || '');
      var ok = rule.test(value);
      setError(rule, ok ? '' : rule.message);
      if (!ok && !firstInvalid) firstInvalid = rule;
    });

    return firstInvalid;
  }

  // Clear a field's error as soon as the user fixes it.
  RULES.forEach(function (rule) {
    var target = form.elements[rule.name];
    if (!target) return;
    var nodes = target.length && !target.tagName ? Array.prototype.slice.call(target) : [target];
    nodes.forEach(function (node) {
      node.addEventListener(rule.group ? 'change' : 'input', function () {
        if (rule.test(rule.group ? '' : node.value || '')) setError(rule, '');
      });
    });
  });

  function levelText() {
    var picked = form.querySelector('input[name="level"]:checked');
    if (!picked) return '—';
    return picked.value === '__other_option__' ? levelOther.value.trim() : picked.value;
  }

  function collect() {
    var data = new FormData(form);
    var goals = data.getAll('goals');
    return {
      'Họ và tên': data.get('fullname'),
      'Điện thoại / Zalo': data.get('phone'),
      'Email': data.get('email'),
      'Trường ĐH / Đơn vị': data.get('org') || '—',
      'Trình độ': levelText(),
      'Đã dùng AI': data.get('aitools') || '—',
      'Mục tiêu': goals.length ? goals.join(', ') : '—',
      'Thời gian cam kết': data.get('commitment') || '—'
    };
  }

  // Google Forms expects entry.NNN=value, urlencoded. Each control declares the
  // id it maps to via data-entry; a .pills wrapper carries it for its group.
  function buildPayload() {
    var params = new URLSearchParams();

    form.querySelectorAll('[data-entry]').forEach(function (node) {
      var entry = node.getAttribute('data-entry');

      if (node.classList.contains('pills')) {
        node.querySelectorAll('input:checked').forEach(function (input) {
          params.append(entry, input.value);
          if (input.value === '__other_option__') {
            var other = document.getElementById(input.getAttribute('data-other'));
            params.append(entry + '.other_option_response', other ? other.value.trim() : '');
          }
        });
        return;
      }

      var value = (node.value || '').trim();
      if (value) params.append(entry, value);
    });

    return params;
  }

  function say(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.className = 'reg-card__status' + (kind ? ' is-' + kind : '');
  }

  function mailtoFallback(summary) {
    var to = form.getAttribute('data-fallback-email') || '';
    var subject = 'Đăng ký tham dự AI & Software Engineering — 02/08/2026';
    var body = Object.keys(summary)
      .map(function (k) { return k + ': ' + summary[k]; })
      .join('\n');

    window.location.href =
      'mailto:' + to +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    say(
      'BTC chưa nối form với hệ thống nhận hồ sơ tự động, nên trình email vừa mở sẵn nội dung đăng ký của bạn — ' +
      'bạn bấm gửi tới ' + to + ' giúp nhé.',
      'ok'
    );
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Honeypot: only bots fill this.
    if (form.elements.website && form.elements.website.value) return;

    var invalid = validate();
    if (invalid) {
      say('Còn vài ô cần bạn xem lại trước khi gửi.', 'error');
      var focusTarget = invalid.group
        ? form.querySelector('input[name="' + invalid.name + '"]')
        : form.elements[invalid.name];
      if (focusTarget && focusTarget.focus) focusTarget.focus();
      return;
    }

    var summary = collect();
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();

    if (!endpoint) {
      mailtoFallback(summary);
      return;
    }

    var isGoogleForm = endpoint.indexOf('docs.google.com/forms') !== -1;

    submitBtn.disabled = true;
    say('Đang gửi hồ sơ…');

    // Google blocks cross-origin reads of /formResponse, so the request goes out
    // no-cors and comes back opaque: a resolved promise means "delivered", not
    // "accepted". Client-side validation mirrors the Google Form's own required
    // fields precisely so an accepted-but-rejected submission cannot happen.
    fetch(endpoint, isGoogleForm
      ? { method: 'POST', mode: 'no-cors', body: buildPayload() }
      : { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!isGoogleForm && !res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        levelOther.hidden = true;
        say(
          'Đã gửi hồ sơ của bạn. BTC sẽ đọc và gửi vé mời qua Zalo trước 17:00 ngày 01/08/2026.',
          'ok'
        );
      })
      .catch(function () {
        var url = form.getAttribute('data-form-url');
        say(
          'Gửi tự động không thành công. Bạn mở form đăng ký trực tiếp' +
          (url ? ' tại ' + url : '') +
          ', hoặc nhắn cho BTC qua Zalo 0983204177 giúp nhé.',
          'error'
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
})();
