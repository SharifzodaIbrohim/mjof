// Student portal — olympiad UI (M.J.O.F + subject filter)
(function () {
  'use strict';

  const API = '';
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* Theme: same key as home (mjof_theme) */
  function setTheme(mode) {
    var dark = mode === 'dark';
    document.body.classList.toggle('dark-theme', dark);
    try { localStorage.setItem('mjof_theme', dark ? 'dark' : 'light'); } catch (e) {}
    var icon = dark ? '☀️' : '🌙';
    ['themeBtn', 'themeBtnLogin'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = icon;
    });
  }
  function initTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem('mjof_theme') || localStorage.getItem('geo_theme');
    } catch (e) {}
    setTheme(saved === 'dark' ? 'dark' : 'light');
    function onToggle() {
      setTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark');
    }
    var b1 = document.getElementById('themeBtn');
    var b2 = document.getElementById('themeBtnLogin');
    if (b1) b1.addEventListener('click', onToggle);
    if (b2) b2.addEventListener('click', onToggle);
  }

  function t(key, params) {
    try {
      if (window.GeoI18n && typeof window.GeoI18n.t === 'function') return window.GeoI18n.t(key, params);
      if (typeof window.t === 'function' && window.t !== t) return window.t(key, params);
    } catch (e) {}
    return key;
  }
  function applyStaticI18n() {
    const map = [
      ['examPrevBtn', 'previous'],
      ['examNextBtn', 'next'],
      ['submitExamBtn', 'submitExam'],
      ['logoutBtn', 'logout'],
      ['backToListBtn', 'back'],
    ];
    map.forEach(function (pair) {
      const el = $(pair[0]);
      if (el) el.textContent = t(pair[1]);
    });
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
      else el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
  }

  let student = null;
  let exam = null;
  let timerId = null;
  let autosaveId = null;

  var SUBJECT_LABELS = {
    physics: 'Физика', math: 'Математика', chemistry: 'Химия',
    biology: 'Биология', russian: 'Русӣ', english: 'Англисӣ',
    geography: 'Ҷуғрофия', history: 'Таърих', informatics: 'Информатика',
    tajik: 'Тоҷикӣ', literature: 'Адабиёт', economy: 'Иқтисод', law: 'Ҳуқуқ',
    general: 'Умумӣ', other: 'Дигар'
  };
  function subjectLabel(code) {
    var c = String(code || '').toLowerCase().trim();
    return SUBJECT_LABELS[c] || (c ? c : '');
  }
  /** Empty / general / умумӣ olympiad → visible to every student. */
  function filterBySubject(list, studentSubject) {
    var s = String(studentSubject || '').toLowerCase().trim();
    return (list || []).filter(function (o) {
      var os = String(o.subject || '').toLowerCase().trim();
      if (!os || os === 'general' || os === 'умумӣ' || os === 'all' || os === 'other') return true;
      if (!s) return true;
      return os === s;
    });
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function show(el, on) {
    if (!el) return;
    el.classList.toggle('hidden', !on);
  }
  async function api(path, opts) {
    const r = await fetch(API + path, Object.assign({
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    }, opts || {}));
    let data = null;
    try { data = await r.json(); } catch (e) { data = {}; }
    if (!r.ok) {
      const err = new Error((data && (data.error || data.message)) || ('HTTP ' + r.status));
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function fmtTime(sec) {
    if (sec == null || sec < 0) return '—';
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function saveLocalStudent(s) {
    try { localStorage.setItem('geografia_student', JSON.stringify(s)); } catch (e) {}
  }
  function loadLocalStudent() {
    try { return JSON.parse(localStorage.getItem('geografia_student') || 'null'); } catch (e) { return null; }
  }
  function clearLocalStudent() {
    try { localStorage.removeItem('geografia_student'); } catch (e) {}
  }

  async function doLogin(id) {
    const data = await api('/api/student/login', {
      method: 'POST',
      body: JSON.stringify({ studentId: id, id: id }),
    });
    student = data.student || data;
    saveLocalStudent(student);
    var badge = document.getElementById('studentSubjectBadge');
    if (badge) {
      var sl = subjectLabel(student.subject);
      if (sl) { badge.textContent = sl; badge.classList.remove('hidden'); }
      else { badge.classList.add('hidden'); }
    }
    $('studentName').textContent = student.fullName || student.id || '—';
    $('studentMeta').textContent = [student.className, student.school].filter(Boolean).join(' · ');
    show($('loginView'), false);
    show($('appView'), true);
    applyStaticI18n();
    await loadList();
  }

  function logout() {
    student = null;
    clearLocalStudent();
    if (timerId) clearInterval(timerId);
    if (autosaveId) clearInterval(autosaveId);
    show($('appView'), false);
    show($('loginView'), true);
  }

  async function loadList() {
    if (!student) return;
    const sid = student.id || student.studentId;
    const data = await api('/api/student/olympiads?studentId=' + encodeURIComponent(sid));
    let oly = data.olympiads || data.items || [];
    let quizzes = data.quizzes || [];
    const stSubj = student.subject || '';
    oly = filterBySubject(oly, stSubj);
    quizzes = filterBySubject(quizzes, stSubj);
    renderEventCards($('olympiadList'), oly, $('emptyOly'));
    renderEventCards($('quizList'), quizzes, $('emptyQuiz'));
  }

  function renderEventCards(box, list, emptyEl) {
    if (!box) return;
    box.innerHTML = '';
    if (!list || !list.length) {
      show(emptyEl, true);
      return;
    }
    show(emptyEl, false);
    list.forEach(function (o) {
      const card = document.createElement('div');
      card.className = 'card';
      const subj = subjectLabel(o.subject);
      const open = o.isOpen || o.windowStatus === 'open';
      const locked = o.accessAllowed === false || o.windowStatus === 'locked';
      let statusBadge = open && !locked ? '<span class="badge open">Кушода</span>' : '<span class="badge locked">Маҳдуд</span>';
      card.innerHTML =
        '<h3>' + esc(o.title || 'Бе ном') + '</h3>' +
        '<div class="meta">' +
          (subj ? '<span class="badge subj">' + esc(subj) + '</span>' : '') +
          statusBadge +
          '<span>' + (o.questionCount || 0) + ' савол</span>' +
        '</div>' +
        '<p class="muted">' + esc((o.description || '').slice(0, 120)) + '</p>' +
        '<div class="actions">' +
          '<button type="button" class="btn primary start-btn" data-id="' + esc(o.id) + '">Оғоз</button>' +
        '</div>';
      box.appendChild(card);
    });
    box.querySelectorAll('.start-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        startExam(btn.getAttribute('data-id'));
      });
    });
  }

  async function startExam(olympiadId) {
    if (!student) return;
    try {
      const data = await api('/api/olympiads/' + encodeURIComponent(olympiadId) + '/start', {
        method: 'POST',
        body: JSON.stringify({ studentId: student.id }),
      });
      exam = data.exam || data;
      exam.olympiadId = olympiadId;
      exam.answers = exam.answers || {};
      exam.index = 0;
      show($('listView'), false);
      show($('resultView'), false);
      show($('examView'), true);
      $('examTitle').textContent = exam.title || 'Имтиҳон';
      renderQuestion();
      startTimer();
      startAutosave();
    } catch (e) {
      alert((e && e.message) || 'Оғоз нашуд');
    }
  }

  function renderQuestion() {
    /* full exam UI restored from previous working student.js */
    if (!exam || !exam.questions) return;
    const qs = exam.questions;
    const i = exam.index || 0;
    const q = qs[i];
    $('examProgress').textContent = 'Савол ' + (i + 1) + ' / ' + qs.length;
    const pane = $('examQuestionPane');
    if (!q) { pane.innerHTML = ''; return; }
    let html = '<p class="q-text">' + esc(q.text || '') + '</p>';
    const qtype = String(q.type || 'single').toLowerCase();
    if (qtype === 'short' || qtype === 'text' || qtype === 'number' || qtype === 'numeric' || qtype === 'open') {
      const prev = (exam.answers[q.id] && (exam.answers[q.id].t || exam.answers[q.id].text)) || '';
      html += '<textarea id="examTextInput" class="exam-text-input" rows="3">' + esc(prev) + '</textarea>';
    } else if (qtype === 'matching' || qtype === 'match') {
      html += '<div class="exam-match">';
      (q.left || q.pairs || []).forEach(function (left, idx) {
        html += '<div class="exam-match-row"><span class="match-left">' + esc(left) + '</span>';
        html += '<select class="match-select" data-idx="' + idx + '">';
        html += '<option value="">—</option>';
        (q.right || q.options || []).forEach(function (r, j) {
          html += '<option value="' + j + '">' + esc(r) + '</option>';
        });
        html += '</select></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="opts">';
      (q.options || []).forEach(function (opt, j) {
        const letter = LETTERS[j] || (j + 1);
        const checked = exam.answers[q.id] && exam.answers[q.id].i === j ? ' selected' : '';
        html += '<label class="opt' + checked + '"><input type="radio" name="qopt" value="' + j + '"' +
          (exam.answers[q.id] && exam.answers[q.id].i === j ? ' checked' : '') + '> <strong>' + letter + '.</strong> ' + esc(opt) + '</label>';
      });
      html += '</div>';
    }
    pane.innerHTML = html;
    pane.querySelectorAll('.opt').forEach(function (lab) {
      lab.addEventListener('click', function () {
        pane.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('selected'); });
        lab.classList.add('selected');
        const inp = lab.querySelector('input');
        if (inp) {
          inp.checked = true;
          exam.answers[q.id] = { i: parseInt(inp.value, 10) };
        }
      });
    });
    const dots = $('examDots');
    if (dots) {
      dots.innerHTML = '';
      qs.forEach(function (_, di) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = String(di + 1);
        b.className = 'dot' + (di === i ? ' active' : '') + (exam.answers[qs[di].id] ? ' done' : '');
        b.addEventListener('click', function () { saveCurrentAnswer(); exam.index = di; renderQuestion(); });
        dots.appendChild(b);
      });
    }
  }

  function saveCurrentAnswer() {
    if (!exam || !exam.questions) return;
    const q = exam.questions[exam.index || 0];
    if (!q) return;
    const qid = String(q.id);
    const qtype = String(q.type || 'single').toLowerCase();
    if (qtype === 'short' || qtype === 'text' || qtype === 'number' || qtype === 'numeric' || qtype === 'open') {
      const inp = $('examTextInput');
      if (inp) {
        const t = inp.value.trim();
        exam.answers[qid] = { t: t, text: t };
      }
    }
  }

  function startTimer() {
    if (timerId) clearInterval(timerId);
    var left = exam.remainingSec != null ? exam.remainingSec : (exam.durationSec || 0);
    function tick() {
      $('examTimer').textContent = fmtTime(left);
      if (left <= 0) {
        clearInterval(timerId);
        submitExam(true);
        return;
      }
      left -= 1;
    }
    tick();
    timerId = setInterval(tick, 1000);
  }

  function startAutosave() {
    if (autosaveId) clearInterval(autosaveId);
    autosaveId = setInterval(function () {
      if (!exam) return;
      saveCurrentAnswer();
      api('/api/olympiads/' + encodeURIComponent(exam.olympiadId) + '/autosave', {
        method: 'POST',
        body: JSON.stringify({ studentId: student.id, answers: exam.answers }),
      }).catch(function () {});
    }, 20000);
  }

  async function submitExam(auto) {
    if (!exam) return;
    saveCurrentAnswer();
    if (timerId) clearInterval(timerId);
    if (autosaveId) clearInterval(autosaveId);
    try {
      const data = await api('/api/olympiads/' + encodeURIComponent(exam.olympiadId) + '/exam-submit', {
        method: 'POST',
        body: JSON.stringify({ studentId: student.id, answers: exam.answers }),
      });
      show($('examView'), false);
      show($('resultView'), true);
      const score = data.score != null ? data.score : (data.percent || 0);
      $('resultScore').textContent = Math.round(score) + '%';
      $('resultDetail').textContent = data.message || '';
      $('resultStatus').textContent = data.passed ? 'Гузашт' : 'Нагузашт';
    } catch (e) {
      alert((e && e.message) || 'Супоридан нашуд');
    }
  }

  async function boot() {
    initTheme();
    applyStaticI18n();
    const form = $('studentLoginForm');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const id = ($('studentIdInput') && $('studentIdInput').value || '').trim();
        if (!id) return;
        try {
          $('loginError').classList.add('hidden');
          await doLogin(id);
        } catch (err) {
          const el = $('loginError');
          if (el) {
            el.textContent = (err && err.message) || 'Хато';
            el.classList.remove('hidden');
          }
        }
      });
    }
    const lo = $('logoutBtn');
    if (lo) lo.addEventListener('click', logout);
    const back = $('backToListBtn');
    if (back) back.addEventListener('click', function () {
      show($('resultView'), false);
      show($('examView'), false);
      show($('listView'), true);
      loadList();
    });
    const prev = $('examPrevBtn');
    if (prev) prev.addEventListener('click', function () {
      saveCurrentAnswer();
      if (exam && exam.index > 0) { exam.index -= 1; renderQuestion(); }
    });
    const next = $('examNextBtn');
    if (next) next.addEventListener('click', function () {
      saveCurrentAnswer();
      if (exam && exam.questions && exam.index < exam.questions.length - 1) {
        exam.index += 1; renderQuestion();
      }
    });
    const sub = $('submitExamBtn');
    if (sub) sub.addEventListener('click', function () { submitExam(false); });

    const local = loadLocalStudent();
    if (local && local.id) {
      try {
        student = local;
        show($('loginView'), false);
        show($('appView'), true);
        $('studentName').textContent = student.fullName || student.id || '—';
        $('studentMeta').textContent = [student.className, student.school].filter(Boolean).join(' · ');
        var badge = document.getElementById('studentSubjectBadge');
        if (badge) {
          var sl = subjectLabel(student.subject);
          if (sl) { badge.textContent = sl; badge.classList.remove('hidden'); }
          else { badge.classList.add('hidden'); }
        }
        await loadList();
      } catch (e) {
        logout();
      }
    }
  }

  initTheme();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
