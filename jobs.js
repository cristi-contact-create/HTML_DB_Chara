import { nullable, escapeHtml, normalizeJob } from './utils.js';
import { loadState, saveState } from './storage.js';

function jobCareer(j) {
  if (!j) return '';
  return j.career || j.title || '';
}
function jobLabel(j) {
  var parts = [];
  if (j) {
    if (j.career) parts.push(j.career);
    if (j.degree) parts.push(j.degree);
    if (j.school) parts.push(j.school);
  }
  return parts.join(' · ');
}

function listJobs() {
  var state = loadState();
  return (state.jobs || []).slice().sort(function(a,b){ return jobCareer(a).localeCompare(jobCareer(b)); });
}
function getJob(id) {
  if (!id) return null;
  id = Number(id);
  var state = loadState();
  return (state.jobs || []).find(function (x) { return Number(x.id) === id; }) || null;
}
function createJob(data) {
  var state = loadState();
  var j = normalizeJob(data || {});
  j.id = state.nextJobId || 1;
  state.nextJobId = (state.nextJobId || 1) + 1;
  state.jobs = state.jobs || [];
  state.jobs.push(j);
  saveState(state);
  return j;
}
function updateJob(id, data) {
  var state = loadState();
  var j = (state.jobs || []).find(function(x){ return Number(x.id) === Number(id); });
  if (!j) return null;
  var newJ = normalizeJob(Object.assign({}, j, data));
  for (var k in newJ) j[k] = newJ[k];
  saveState(state);
  return j;
}
function deleteJob(id) {
  id = Number(id);
  var state = loadState();
  state.jobs = (state.jobs || []).filter(function (x) { return Number(x.id) !== id; });
  // clear job references on characters
  (state.characters || []).forEach(function(c){ if (c.job_id === id) c.job_id = null; });
  saveState(state);
}

function fillJobSelect(selectedId) {
  var sel = document.querySelector('#form-character select[name="job_id"]');
  if (!sel) return;
  sel.innerHTML = '<option value="">— None —</option>' +
    listJobs().map(function (j) {
      return '<option value="' + j.id + '"' + (j.id === selectedId ? ' selected' : '') + '>' + escapeHtml(jobLabel(j) || ('Job ' + j.id)) + '</option>';
    }).join('');
}

export { jobCareer, jobLabel, listJobs, getJob, createJob, updateJob, deleteJob, fillJobSelect };
