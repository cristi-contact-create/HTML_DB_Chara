import { $, $$, escapeHtml, nullable, fullName, photoButtonHtml, degreeColors, degreeChipStyle, formatBirthday, MAX_JOB_CHARS_SHOWN, renderIconSvg, renderStatusIcon, _iconShapes, _iconColors, normalizeJob } from './utils.js';
import { loadState, saveState, seedExamples } from './storage.js';
import { listJobs, getJob, createJob, updateJob, deleteJob, fillJobSelect, jobLabel, jobCareer } from './jobs.js';
import { listCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter, enrichCharacter, renderCharacters } from './chars.js';
import { setCharacterImage, clearCharacterImage, getCharacterImageUrl, imageKey } from './images.js';
import { exportJobsToFile, importJobsFromFile } from './DBjobs.js';
import { exportCharactersToFile, importCharactersFromFile } from './DBchars.js';

// App state
var jobsAll = [];
var charactersCache = [];
var allCharactersEnriched = [];
var pendingImages = { 1: null, 2: null };
var pendingPreviewUrls = { 1: null, 2: null };
var cardCols = 6;
var readyFilter = "";
var CARD_COLS_KEY = "chara_card_cols";

function buildIconPicker(selected) {
  var el = $("#icon-picker");
  if (!el) return;
  var html = [];
  _iconShapes.forEach(function (shape) {
    _iconColors.forEach(function (color) {
      var spec = shape + "|" + color;
      var cls = spec === selected ? 'icon-btn selected' : 'icon-btn';
      html.push('<button type="button" class="' + cls + '" data-icon="' + spec + '" title="' + shape + '">' + renderIconSvg(spec, 14) + '</button>');
    });
  });
  el.innerHTML = html.join("");
}

function setReadyFilter(value) {
  readyFilter = value;
  $$(".filter-pill").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-ready") === value);
  });
  refreshAll();
}

function loadCardCols() {
  var n = parseInt(localStorage.getItem(CARD_COLS_KEY) || "6", 10);
  if (isNaN(n) || n < 3) n = 3;
  if (n > 12) n = 12;
  cardCols = n;
  applyCardCols();
}
function applyCardCols() {
  var el = $("#char-list");
  if (el) el.style.setProperty("--card-cols", String(cardCols));
  var label = $("#card-cols-label");
  if (label) label.textContent = String(cardCols);
}
function changeCardCols(delta) {
  cardCols = Math.min(12, Math.max(3, cardCols + delta));
  localStorage.setItem(CARD_COLS_KEY, String(cardCols));
  applyCardCols();
}

function naturalCompare(a, b) {
  var aa = String(a || '');
  var bb = String(b || '');
  var re = /(\d+|\D+)/g;
  var aParts = aa.match(re) || [aa];
  var bParts = bb.match(re) || [bb];
  var len = Math.max(aParts.length, bParts.length);
  for (var i = 0; i < len; i++) {
    var ap = aParts[i] || '';
    var bp = bParts[i] || '';
    var anum = /^\d+$/.test(ap);
    var bnum = /^\d+$/.test(bp);
    if (anum && bnum) {
      var av = parseInt(ap, 10);
      var bv = parseInt(bp, 10);
      if (av !== bv) return av - bv;
    } else {
      var cmp = ap.localeCompare(bp, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }
  return aa.localeCompare(bb, undefined, { sensitivity: 'base' });
}

function sortCharacters(chars) {
  var items = (chars || []).slice();
  items.sort(function (a, b) {
    var aLast = String(a && a.last_name || '').trim();
    var bLast = String(b && b.last_name || '').trim();
    var aFirst = String(a && a.name || '').trim();
    var bFirst = String(b && b.name || '').trim();
    var lastCmp = naturalCompare(aLast, bLast);
    if (lastCmp !== 0) return lastCmp;
    var firstCmp = naturalCompare(aFirst, bFirst);
    if (firstCmp !== 0) return firstCmp;
    return naturalCompare(fullName(a), fullName(b));
  });
  return items;
}

function getImageFocus(slot) {
  var form = document.getElementById('form-character');
  if (!form) return 'center center';
  var field = form.elements['image' + slot + '_focus'];
  return (field && field.value) ? field.value : 'center center';
}

function setImageSlot(slot, url) {
  var box = $('.image-slot[data-slot="' + slot + '"]');
  if (!box) return;
  var img = box.querySelector('img');
  var removeBtn = box.querySelector('.remove-img');
  if (url) {
    img.src = url;
    img.hidden = false;
    img.style.objectPosition = getImageFocus(slot);
    img.setAttribute('data-photo-view', '1');
    removeBtn.hidden = false;
  } else {
    img.removeAttribute('src');
    img.style.objectPosition = '';
    img.removeAttribute('data-photo-view');
    img.hidden = true;
    removeBtn.hidden = true;
  }
}

function clearPendingImages() {
  [1,2].forEach(function (slot) {
    if (pendingPreviewUrls[slot]) URL.revokeObjectURL(pendingPreviewUrls[slot]);
    pendingPreviewUrls[slot] = null;
    pendingImages[slot] = null;
  });
}

function refreshAll() {
  jobsAll = listJobs();
  var q = ($('#char-search') && $('#char-search').value.trim()) || "";
  var ready = readyFilter;
  var sortedCharacters = sortCharacters(listCharacters() || []);
  allCharactersEnriched = sortedCharacters.map(function(c){ return enrichCharacter(c); });
  charactersCache = allCharactersEnriched.filter(function (c) {
    if (ready === 'true' && !c.ready) return false;
    if (ready === 'false' && c.ready) return false;
    if (!q) return true;
    var like = q.toLowerCase();
    return (
      c.name.toLowerCase().indexOf(like) >= 0 ||
      c.last_name.toLowerCase().indexOf(like) >= 0 ||
      (c.team_club && c.team_club.toLowerCase().indexOf(like) >= 0) ||
      (c.skills && c.skills.toLowerCase().indexOf(like) >= 0)
    );
  });
  // render characters
  var el = $('#char-list');
  if (!charactersCache.length) {
    el.innerHTML = '<p class="empty-state">No characters yet.<br><button type="button" class="btn primary" data-action="add-char">+ Add character</button></p>';
  } else {
    el.innerHTML = charactersCache.map(function(c){
      var cardClass = 'card' + (c.job_degree ? '' : ' card-no-job');
      var cardStyle = '';
      if (c.job_degree) {
        var dc = degreeColors(c.job_degree);
        cardStyle = ' style="border-color:' + dc.border + ';box-shadow:0 0 12px ' + dc.glow + '"';
      }
      var thumbInner = c.image1 ? photoButtonHtml(c.image1, fullName(c), 'card-photo-btn', c.image1_focus) : 'No image';
      var jobInfo = [c.job_title, c.job_degree, c.job_school].filter(Boolean).join(' · ');
      var bday = formatBirthday(c.birthday);
      var meta = [jobInfo, bday].filter(Boolean).join(' · ');
      var statusIconHtml = renderStatusIcon(c.status_icon);
      var teamHtml = c.team_club ? '<div class="card-team">' + escapeHtml(c.team_club) + '</div>' : '';
      return '<article class="' + cardClass + '" data-id="' + c.id + '"' + cardStyle + '>' +
        '<div class="card-thumb ' + (c.image1 ? '' : 'empty') + '">' + thumbInner + '</div>' +
        '<div class="card-body"><div class="card-header"><span class="badge ' + (c.ready ? 'ready' : 'pending') + '">' + (c.ready ? 'Ready' : 'Draft') + '</span>' + statusIconHtml + '</div>' +
        '<h3 class="card-name">' + escapeHtml(fullName(c)) + '</h3>' +
        teamHtml +
        '<p class="card-meta">' + escapeHtml(meta || '—') + '</p></div></article>';
    }).join('');
  }
  if ($('#panel-jobs').classList.contains('active')) renderJobs();
  if ($('#popup-character').classList.contains('is-open')) {
    var selectedId = $('#form-character').elements.job_id.value;
    fillJobSelect(selectedId ? Number(selectedId) : null);
  }
}

function renderJobs() {
  var el = $('#job-list');
  var q = ($('#job-search') && $('#job-search').value.trim()) || '';
  var jobs = (jobsAll || []).filter(function (j) {
    if (!q) return true;
    var like = q.toLowerCase();
    var nj = normalizeJob(j);
    return (
      (nj.school && nj.school.toLowerCase().indexOf(like) >= 0) ||
      (nj.degree && nj.degree.toLowerCase().indexOf(like) >= 0) ||
      (jobCareer(nj).toLowerCase().indexOf(like) >= 0) ||
      (nj.comment && nj.comment.toLowerCase().indexOf(like) >= 0)
    );
  });
  if (!jobs.length) {
    el.innerHTML = '<p class="empty-state">No jobs yet. <button type="button" class="btn primary" data-action="add-job">+ Add job</button></p>';
    return;
  }
  var byJob = {};
  allCharactersEnriched.forEach(function (c) { if (c.job_id) { if (!byJob[c.job_id]) byJob[c.job_id] = []; byJob[c.job_id].push(c); } });
  el.innerHTML = jobs.map(function (j) {
    var nj = normalizeJob(j);
    var chars = byJob[nj.id] || [];
    var dc = degreeColors(nj.degree);
    var rowStyle = 'border-left-color:' + dc.border + ';background:linear-gradient(90deg,' + dc.bg + ' 0%, transparent 55%)';
    var fields = [];
    if (nj.school) fields.push('<span><strong>School</strong> ' + escapeHtml(nj.school) + '</span>');
    if (nj.degree) fields.push('<span class="degree-pill" style="border-color:' + dc.border + ';color:' + dc.text + ';background:' + dc.chipBg + '">' + escapeHtml(nj.degree) + '</span>');
    return '<article class="job-row degree-tint" data-id="' + nj.id + '" style="' + rowStyle + '">' +
      '<div class="job-row-head"><h3 class="job-career">' + escapeHtml(jobCareer(nj)) + '</h3></div>' +
      (fields.length ? '<p class="job-fields">' + fields.join('') + '</p>' : '') +
      (nj.comment ? '<p class="job-comment">' + escapeHtml(nj.comment) + '</p>' : '') +
      renderCharRow(chars, MAX_JOB_CHARS_SHOWN, nj.degree) +
      '</article>';
  }).join('');
}

function renderCharRow(chars, max, degree) {
  max = max || MAX_JOB_CHARS_SHOWN;
  if (!chars.length) return '<p class="job-chars-empty">No characters assigned</p>';
  var shown = chars.slice(0, max);
  var html = shown.map(function (c) { return renderCharChip(c, degree); }).join('');
  if (chars.length > max) {
    var moreStyle = degree ? ' style="' + degreeChipStyle(degree) + '"' : '';
    html += '<div class="job-char-chip job-char-more"' + moreStyle + '><span class="job-char-photo empty">+' + (chars.length - max) + '</span><span class="job-char-name">more</span></div>';
  }
  return '<div class="job-chars-row">' + html + '</div>';
}

function renderCharChip(c, degree) {
  var photo = c.image1 ? photoButtonHtml(c.image1, fullName(c), 'job-char-photo-btn', c.image1_focus) : '<span class="job-char-photo empty">?</span>';
  var chipStyle = degree ? ' style="' + degreeChipStyle(degree) + '"' : '';
  return '<div class="job-char-chip" data-char-id="' + c.id + '" title="' + escapeHtml(fullName(c)) + (degree ? ' · ' + escapeHtml(degree) : '') + '"' + chipStyle + '>' + photo + '<span class="job-char-name">' + escapeHtml(fullName(c)) + '</span></div>';
}

function openPopup(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.add('is-open');
  el.removeAttribute('hidden');
  document.body.classList.add('popup-open');
}
function closePopup(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('is-open');
  el.setAttribute('hidden', '');
  if (!$$('.popup-overlay.is-open').length) document.body.classList.remove('popup-open');
}

function switchTab(tabName) {
  $$('.tab').forEach(function(t){ t.classList.toggle('active', t.getAttribute('data-tab') === tabName); });
  $$('.panel').forEach(function(p){ p.classList.toggle('active', p.id === 'panel-' + tabName); });
  if (tabName === 'jobs') renderJobs();
}

function openPhotoViewer(url, caption) {
  if (!url) return;
  var img = $('#photo-viewer-img');
  var cap = $('#photo-viewer-caption');
  img.src = url;
  img.alt = caption || 'Character photo';
  img.style.objectPosition = 'center center';
  cap.textContent = caption || '';
  openPopup('popup-photo');
}

function _birthdayToParts(b) {
  // return { day: 'DD', month: 'Mon' } or {day:'',month:''}
  if (!b) return { day: '', month: '' };
  try {
    var parts = String(b).split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (parts.length === 3) {
      var mm = parts[1].padStart(2, '0');
      var dd = parts[2].padStart(2, '0');
      var mon = months[parseInt(mm, 10) - 1] || '';
      return { day: dd, month: mon };
    }
    if (parts.length === 2) {
      // stored as MM-DD or DD-Mon; try to detect
      var a = parts[0], b2 = parts[1];
      // if second part is alpha assume MM-DD? fallback
      if (/\D/.test(b2)) {
        // probably DD-Mon
        return { day: a.padStart(2,'0'), month: b2.slice(0,3).replace(/(^.)/, function(s){ return s.toUpperCase(); }) };
      } else {
        // probably MM-DD
        var mm2 = a.padStart(2,'0');
        var dd2 = b2.padStart(2,'0');
        var mon2 = months[parseInt(mm2,10)-1] || '';
        return { day: dd2, month: mon2 };
      }
    }
    return { day: '', month: '' };
  } catch (err) { return { day: '', month: '' }; }
}

function _partsToStoredBirthday(day, month) {
  if (!day || !month) return null;
  var dd = String(day).trim().padStart(2, '0');
  var mon = String(month).trim().slice(0,3).toLowerCase();
  var map = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  var mm = map[mon];
  if (!mm) return null;
  return '2000-' + mm + '-' + dd;
}

function openCharacterForm(id) {
  var form = $('#form-character');
  form.reset();
  clearPendingImages();
  setImageSlot(1, null);
  setImageSlot(2, null);
  fillJobSelect(null);
  $('#btn-delete-character').hidden = !!(!id);
  $('#char-form-title').textContent = id ? 'Edit character' : 'Add character';

  if (id) {
    var c = enrichCharacter(getCharacter(id));
    form.elements.id.value = c.id;
    form.elements.ready.checked = c.ready;
    form.elements.name.value = c.name;
    form.elements.last_name.value = c.last_name;
    // birthday is stored as YYYY-MM-DD internally; show as two fields (day, month)
    if (form.elements['bday_day']) {
      var parts = _birthdayToParts(c.birthday || '');
      form.elements['bday_day'].value = parts.day || '';
      form.elements['bday_month'].value = parts.month || '';
    }
    form.elements.constellation.value = c.constellation || '';
    form.elements.height.value = c.height || '';
    form.elements.team_club.value = c.team_club || '';
    form.elements.job_id.value = c.job_id || '';
    form.elements.skills.value = c.skills || '';
    form.elements.hobby.value = c.hobby || '';
    form.elements.weakness.value = c.weakness || '';
    form.elements['image1_focus'].value = c.image1_focus || 'center center';
    form.elements['image2_focus'].value = c.image2_focus || 'center center';
    setImageSlot(1, c.image1);
    setImageSlot(2, c.image2);
    fillJobSelect(c.job_id);
    form.elements.status_icon.value = c.status_icon || '';
    buildIconPicker(c.status_icon || null);
  } else {
    form.elements.id.value = '';
    // clear the bday day/month inputs if present
    if (form.elements['bday_day']) form.elements['bday_day'].value = '';
    if (form.elements['bday_month']) form.elements['bday_month'].value = '';
    form.elements['image1_focus'].value = 'center center';
    form.elements['image2_focus'].value = 'center center';
    form.elements.status_icon.value = '';
    buildIconPicker(null);
  }
  openPopup('popup-character');
}

function openJobForm(id) {
  var form = $('#form-job');
  form.reset();
  $('#btn-delete-job').hidden = !!(!id);
  $('#job-form-title').textContent = id ? 'Edit job' : 'Add job';
  $('#job-characters-preview').hidden = true;

  if (id) {
    var j = normalizeJob(getJob(id));
    form.elements.id.value = j.id;
    form.elements.school.value = j.school || '';
    form.elements.degree.value = j.degree || '';
    form.elements.career.value = jobCareer(j);
    form.elements.comment.value = j.comment || '';
    var chars = listCharacters().filter(function(c){ return c.job_id === id; }).map(enrichCharacter);
    if (chars.length) {
      $('#job-characters-preview').hidden = false;
      $('#job-characters-list').innerHTML = chars.map(function(c){ return renderCharChip(c, j.degree); }).join('');
    }
  } else {
    form.elements.id.value = '';
  }
  openPopup('popup-job');
}

function saveCharacterForm(e) {
  e.preventDefault();
  var form = e.target;
  var id = form.elements.id.value;
  var payload = {
    ready: form.elements.ready.checked,
    name: form.elements.name.value.trim(),
    last_name: form.elements.last_name.value.trim(),
    // store birthday as YYYY-MM-DD (use 2000 as placeholder year for day+month inputs)
    birthday: (form.elements['bday_day'] && form.elements['bday_month'] && form.elements['bday_day'].value && form.elements['bday_month'].value) ? _partsToStoredBirthday(form.elements['bday_day'].value, form.elements['bday_month'].value) : null,
    constellation: nullable(form.elements.constellation.value),
    height: nullable(form.elements.height.value),
    team_club: nullable(form.elements.team_club.value),
    job_id: form.elements.job_id.value ? Number(form.elements.job_id.value) : null,
    skills: nullable(form.elements.skills.value),
    hobby: nullable(form.elements.hobby.value),
    weakness: nullable(form.elements.weakness.value),
    status_icon: form.elements.status_icon && form.elements.status_icon.value ? form.elements.status_icon.value : null,
    image1_focus: form.elements['image1_focus'] ? form.elements['image1_focus'].value : 'center center',
    image2_focus: form.elements['image2_focus'] ? form.elements['image2_focus'].value : 'center center',
  };
  if (!payload.name || !payload.last_name) { alert('Name and last name are required.'); return; }
  var charId;
  if (id) { updateCharacter(Number(id), payload); charId = Number(id); }
  else { var saved = createCharacter(payload); charId = saved.id; }
  var slots = [1,2];
  var done = 0;
  function finishSave() { done++; if (done >= slots.length) { clearPendingImages(); closePopup('popup-character'); refreshAll(); } }
  slots.forEach(function(slot){ if (pendingImages[slot]) { setCharacterImage(charId, slot, pendingImages[slot], finishSave); } else finishSave(); });
}

function saveJobForm(e) {
  e.preventDefault();
  var form = e.target;
  var id = form.elements.id.value;
  var payload = {
    school: nullable(form.elements.school.value),
    degree: nullable(form.elements.degree.value),
    career: form.elements.career.value.trim(),
    comment: nullable(form.elements.comment.value),
  };
  if (!payload.career) { alert('Career is required.'); return; }
  if (id) updateJob(Number(id), payload); else createJob(payload);
  closePopup('popup-job'); refreshAll();
}

// Events
document.addEventListener('click', function(e){
  var tab = e.target.closest('.tab'); if (tab) { switchTab(tab.getAttribute('data-tab')); return; }
  if (e.target.closest('[data-close="popup-character"]')) { closePopup('popup-character'); return; }
  if (e.target.closest('[data-close="popup-job"]')) { closePopup('popup-job'); return; }
  if (e.target.closest('[data-close="popup-photo"]')) { closePopup('popup-photo'); return; }
  var photoBtn = e.target.closest('[data-photo]'); if (photoBtn) { e.stopPropagation(); e.preventDefault(); openPhotoViewer(photoBtn.getAttribute('data-photo'), photoBtn.getAttribute('data-name')); return; }
  var formPhoto = e.target.closest('#form-character img[data-photo-view]'); if (formPhoto && formPhoto.src) { e.stopPropagation(); var charName = ($('#form-character').elements.name.value || '') + ' ' + ($('#form-character').elements.last_name.value || ''); openPhotoViewer(formPhoto.src, charName.trim() || 'Character photo'); return; }
  var iconBtn = e.target.closest('.icon-btn'); if (iconBtn) { e.stopPropagation(); var spec = iconBtn.getAttribute('data-icon'); var form = $('#form-character'); if (form) { form.elements.status_icon.value = spec; } var picker = iconBtn.closest('.icon-picker'); if (picker) { picker.querySelectorAll('.icon-btn').forEach(function(b){ b.classList.toggle('selected', b === iconBtn); }); } return; }
  var action = e.target.getAttribute('data-action'); if (action === 'add-char' || e.target.id === 'btn-new-character') { openCharacterForm(null); return; } if (action === 'add-job' || e.target.id === 'btn-new-job') { openJobForm(null); return; }
  var pill = e.target.closest('.filter-pill'); if (pill) { setReadyFilter(pill.getAttribute('data-ready')); return; }
  if (e.target.id === 'card-cols-minus') { changeCardCols(1); return; }
  if (e.target.id === 'card-cols-plus') { changeCardCols(-1); return; }
  var charChip = e.target.closest('.job-char-chip[data-char-id]'); if (charChip) { e.stopPropagation(); openCharacterForm(Number(charChip.getAttribute('data-char-id'))); return; }
  var card = e.target.closest('.card'); if (card) { openCharacterForm(Number(card.getAttribute('data-id'))); return; }
  var jobRow = e.target.closest('.job-row'); if (jobRow) { openJobForm(Number(jobRow.getAttribute('data-id'))); return; }
  if (e.target.id === 'btn-delete-character') { var cid = $('#form-character').elements.id.value; if (cid && confirm('Delete this character?')) { deleteCharacter(Number(cid)); closePopup('popup-character'); refreshAll(); } return; }
  if (e.target.id === 'btn-delete-job') { var jid = $('#form-job').elements.id.value; if (jid && confirm('Delete this job?')) { deleteJob(Number(jid)); closePopup('popup-job'); refreshAll(); } return; }
  var overlay = e.target.closest('.popup-overlay'); if (overlay && e.target === overlay) { closePopup(overlay.id); }
});

document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { var open = $$('.popup-overlay.is-open'); if (open.length) closePopup(open[open.length - 1].id); } });

$('#form-character').addEventListener('submit', saveCharacterForm);
$('#form-job').addEventListener('submit', saveJobForm);

// Update card visual style for a character when job selection changes (live preview)
function updateCardStyle(charId, degree) {
  var card = document.querySelector('.card[data-id="' + charId + '"]');
  if (!card) return;
  if (degree) {
    var dc = degreeColors(degree);
    card.style.borderColor = dc.border;
    card.style.boxShadow = '0 0 12px ' + dc.glow;
  } else {
    card.style.removeProperty('border-color');
    card.style.removeProperty('box-shadow');
  }
}

var jobSelectEl = document.querySelector('#form-character select[name="job_id"]');
if (jobSelectEl) {
  jobSelectEl.addEventListener('change', function () {
    try {
      var sel = this.value ? Number(this.value) : null;
      var charId = $('#form-character').elements.id.value;
      if (!charId) return; // no live preview for new (unsaved) char
      var degree = sel ? (getJob(sel) ? getJob(sel).degree : null) : null;
      updateCardStyle(Number(charId), degree);
    } catch (err) { /* ignore */ }
  });
}

$('#char-search').addEventListener('input', function(){ refreshAll(); });
$('#job-search').addEventListener('input', function(){ renderJobs(); });

$$('#form-character input[type="file"][data-upload]').forEach(function(input){ input.addEventListener('change', function(){ var file = input.files && input.files[0]; if (!file) return; var slot = Number(input.getAttribute('data-upload')); var charId = $('#form-character').elements.id.value; if (!charId) { if (pendingPreviewUrls[slot]) URL.revokeObjectURL(pendingPreviewUrls[slot]); pendingImages[slot] = file; pendingPreviewUrls[slot] = URL.createObjectURL(file); setImageSlot(slot, pendingPreviewUrls[slot]); input.value = ''; return; } setCharacterImage(Number(charId), slot, file, function(url){ setImageSlot(slot, url); input.value = ''; refreshAll(); }); }); });

$$('.remove-img').forEach(function(btn){ btn.addEventListener('click', function(){ var slot = Number(btn.getAttribute('data-slot')); var charId = $('#form-character').elements.id.value; if (!charId) { if (pendingPreviewUrls[slot]) URL.revokeObjectURL(pendingPreviewUrls[slot]); pendingPreviewUrls[slot] = null; pendingImages[slot] = null; setImageSlot(slot, null); return; } clearCharacterImage(Number(charId), slot); setImageSlot(slot, null); refreshAll(); }); });

// Start
try { localStorage.setItem('__test__', '1'); localStorage.removeItem('__test__'); } catch(err) { alert('localStorage is blocked. Use Chrome or Edge and allow storage.'); }

// wire import/export buttons
(function(){
  var btnExp = document.getElementById('btn-export-jobs');
  if (btnExp) btnExp.addEventListener('click', function(){ exportJobsToFile(); });
  var inp = document.getElementById('input-import-jobs');
  if (inp) {
    inp.addEventListener('change', function(e){
      var file = inp.files && inp.files[0];
      if (!file) return;
      importJobsFromFile(file, { replace: false }).then(function(res){
        alert('Imported jobs: ' + res.imported + (res.replaced ? ' (replaced existing jobs)' : ' (merged)'));
        refreshAll();
      }).catch(function(err){ alert('Import failed: ' + err.message); });
      inp.value = '';
    });
  }
  // characters import/export wiring
  var btnExpChars = document.getElementById('btn-export-chars');
  if (btnExpChars) btnExpChars.addEventListener('click', function(){ exportCharactersToFile(); });
  var inpChars = document.getElementById('input-import-chars');
  if (inpChars) {
    inpChars.addEventListener('change', function(e){
      var file = inpChars.files && inpChars.files[0];
      if (!file) return;
      importCharactersFromFile(file, { replace: false }).then(function(res){
        alert('Imported characters: ' + res.imported + (res.replaced ? ' (replaced existing characters)' : ' (merged)'));
        refreshAll();
      }).catch(function(err){ alert('Import failed: ' + err.message); });
      inpChars.value = '';
    });
  }
})();

loadCardCols();
seedExamples(false);
refreshAll();
buildIconPicker(null);
(function(){ var fs = document.getElementById('fieldset-status-icon'); if (!fs) return; fs.addEventListener('click', function(e){ var el = fs.querySelector('.icon-btn'); if (!el) return; if (e.target.closest('button') || e.target.closest('select') || e.target.tagName === 'LABEL') return; try { el.focus(); } catch(err) {} }); })();
