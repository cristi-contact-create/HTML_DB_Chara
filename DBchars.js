import { loadState, saveState } from './storage.js';

function imageKey(charId, slot) {
  return String(charId) + '_' + String(slot);
}

// Export characters + images as JSON
function exportCharactersJson() {
  var state = loadState();
  var payload = {
    characters: (state.characters || []).slice(),
    images: (state.images || {}),
  };
  return JSON.stringify(payload, null, 2);
}

function exportCharactersToFile(filename) {
  filename = filename || 'chara_characters_export.json';
  var json = exportCharactersJson();
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

// Import characters from an object: { characters: [...], images: {key: dataUrl} }
// options: { replace: boolean }
function importCharactersFromObject(obj, options) {
  options = options || {};
  var state = loadState();
  var incoming = (obj && obj.characters) || [];
  var incomingImages = (obj && obj.images) || {};

  if (options.replace) {
    // replace characters and images
    state.characters = incoming.map(function(c){ c.id = Number(c.id) || null; return c; });
    // recompute nextCharId
    var mx = 0;
    state.characters.forEach(function(c){ if (c.id && c.id > mx) mx = c.id; });
    state.nextCharId = mx + 1;
    // replace images directly
    state.images = Object.assign({}, incomingImages || {});
    saveState(state);
    return { replaced: true, imported: state.characters.length };
  }

  // merge: keep existing characters, add new ones (assign new ids when needed)
  state.characters = state.characters || [];
  state.images = state.images || {};
  var existingIds = new Set(state.characters.map(function(c){ return Number(c.id); }));
  var idMap = {}; // oldId -> newId

  incoming.forEach(function(c){
    var oldId = Number(c.id) || null;
    if (!oldId || existingIds.has(oldId)) {
      // assign new id
      var nid = state.nextCharId = (state.nextCharId || 1);
      state.nextCharId++;
      idMap[oldId] = nid;
      c.id = nid;
    } else {
      // keep id
      idMap[oldId] = oldId;
      c.id = oldId;
    }
    state.characters.push(c);
    existingIds.add(Number(c.id));
  });

  // merge images: keys like "<oldId>_<slot>"
  Object.keys(incomingImages || {}).forEach(function(k){
    var m = k.match(/^([0-9]+)_(\d+)$/);
    if (!m) return;
    var oldId = Number(m[1]);
    var slot = m[2];
    var newId = idMap[oldId];
    if (!newId) return; // no corresponding character imported
    state.images[imageKey(newId, slot)] = incomingImages[k];
  });

  saveState(state);
  return { replaced: false, imported: incoming.length };
}

function importCharactersFromFile(file, options) {
  options = options || {};
  return new Promise(function(resolve, reject){
    if (!file) return reject(new Error('No file provided'));
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var obj = JSON.parse(String(reader.result));
        var res = importCharactersFromObject(obj, options);
        resolve(res);
      } catch (err) { reject(err); }
    };
    reader.onerror = function(e){ reject(e); };
    reader.readAsText(file);
  });
}

export { exportCharactersJson, exportCharactersToFile, importCharactersFromObject, importCharactersFromFile };
