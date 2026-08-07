import { loadState, saveState } from './storage.js';
import { normalizeJob } from './utils.js';

// Export jobs as JSON string (array)
function exportJobsJson() {
  var state = loadState();
  var payload = { jobs: (state.jobs || []).map(normalizeJob) };
  return JSON.stringify(payload, null, 2);
}

// Trigger a file download with jobs JSON
function exportJobsToFile(filename) {
  filename = filename || 'chara_jobs_export.json';
  var json = exportJobsJson();
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Import jobs from a parsed object { jobs: [...] }
// options: { replace: boolean } - if replace true, existing jobs are replaced, else merged (ids preserved and new ids assigned)
function importJobsFromObject(obj, options) {
  options = options || {};
  var state = loadState();
  var incoming = (obj && obj.jobs) || [];
  incoming = incoming.map(function (j) { return normalizeJob(j || {}); });
  if (options.replace) {
    // replace jobs and reset nextJobId to avoid collisions
    state.jobs = incoming.map(function (j) {
      // ensure numeric id
      j.id = Number(j.id) || null;
      return j;
    });
    // compute nextJobId
    var mx = 0;
    state.jobs.forEach(function (j) { if (j.id && j.id > mx) mx = j.id; });
    state.nextJobId = mx + 1;
    saveState(state);
    return { replaced: true, imported: state.jobs.length };
  }
  // merge: keep existing jobs, add new ones (if id conflicts, assign new ids)
  state.jobs = state.jobs || [];
  var existingIds = new Set(state.jobs.map(function (j) { return Number(j.id); }));
  incoming.forEach(function (j) {
    var id = Number(j.id) || null;
    if (!id || existingIds.has(id)) {
      // assign new id
      j.id = state.nextJobId = (state.nextJobId || 1);
      state.nextJobId++;
    }
    state.jobs.push(j);
    existingIds.add(Number(j.id));
  });
  saveState(state);
  return { replaced: false, imported: incoming.length };
}

// Import jobs from a File (File object from input[type=file])
function importJobsFromFile(file, options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    if (!file) return reject(new Error('No file provided'));
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(String(reader.result));
        var res = importJobsFromObject(obj, options);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = function (e) { reject(e); };
    reader.readAsText(file);
  });
}

export { exportJobsJson, exportJobsToFile, importJobsFromObject, importJobsFromFile };
