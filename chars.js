import { loadState, saveState } from './storage.js';
import { getJob, jobLabel } from './jobs.js';
import { getCharacterImageUrl } from './images.js';
import { fullName, formatBirthday, makePlaceholderPng, escapeHtml, renderStatusIcon } from './utils.js';

function listCharacters() {
  return loadState().characters.slice();
}
function getCharacter(id) {
  if (!id) return null;
  id = Number(id);
  return (loadState().characters || []).find(function (x) { return Number(x.id) === id; }) || null;
}
function createCharacter(data) {
  var state = loadState();
  var c = Object.assign({}, data || {});
  c.id = state.nextCharId || 1;
  state.nextCharId = (state.nextCharId || 1) + 1;
  state.characters = state.characters || [];
  state.characters.push(c);
  saveState(state);
  return c;
}
function updateCharacter(id, data) {
  var state = loadState();
  var c = (state.characters || []).find(function (x) { return Number(x.id) === Number(id); });
  if (!c) return null;
  for (var k in data) c[k] = data[k];
  saveState(state);
  return c;
}
function deleteCharacter(id) {
  id = Number(id);
  var state = loadState();
  state.characters = (state.characters || []).filter(function (x) { return Number(x.id) !== id; });
  delete state.images[id + '_1'];
  delete state.images[id + '_2'];
  saveState(state);
}

function enrichCharacter(char) {
  if (!char) return null;
  var state = loadState();
  var c = Object.assign({}, char);
  c.fullName = fullName(c);
  c.job = getJob(c.job_id) || null;
  c.jobLabel = jobLabel(c.job);
  // expose specific job fields for UI coloring and display
  c.job_title = c.job ? (c.job.career || c.job.title || null) : null;
  c.job_degree = c.job ? (c.job.degree || null) : null;
  c.job_school = c.job ? (c.job.school || null) : null;
  c.bdayShort = formatBirthday(c.birthday);
  c.image1 = getCharacterImageUrl(c.id, 1) || makePlaceholderPng((c.name || '').charAt(0) || '?');
  c.image2 = getCharacterImageUrl(c.id, 2) || null;
  c.image1_focus = c.image1_focus || 'center center';
  return c;
}

function renderCharCard(char) {
  var c = enrichCharacter(char);
  var html = '<div class="card">';
  html += '<div class="card-header">';
  html += renderStatusIcon(c.status_icon) || '';
  html += '<h3>' + escapeHtml(c.fullName) + '</h3>';
  html += '</div>';
  html += '<div class="card-meta">';
  if (c.jobLabel) html += '<div class="card-job">' + escapeHtml(c.jobLabel) + '</div>';
  if (c.bdayShort) html += '<div class="card-bday">' + escapeHtml(c.bdayShort) + '</div>';
  if (c.team_club) html += '<div class="card-team">' + escapeHtml(c.team_club) + '</div>';
  html += '</div>';
  html += '</div>';
  return html;
}

function renderCharacters(container) {
  container.innerHTML = '';
  (listCharacters() || []).forEach(function (ch) {
    container.insertAdjacentHTML('beforeend', renderCharCard(ch));
  });
}

export { listCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter, enrichCharacter, renderCharacters };
