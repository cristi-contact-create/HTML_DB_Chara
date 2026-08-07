import { loadState, saveState } from './storage.js';

function imageKey(charId, slot) {
  return String(charId) + "_" + String(slot);
}
function setCharacterImage(charId, slot, fileOrData, callback) {
  // fileOrData may be a File or a data URL string
  if (typeof fileOrData === 'string') {
    var state = loadState();
    state.images = state.images || {};
    state.images[imageKey(charId, slot)] = fileOrData;
    saveState(state);
    if (callback) callback(fileOrData);
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    var state = loadState();
    state.images = state.images || {};
    state.images[imageKey(charId, slot)] = reader.result;
    saveState(state);
    if (callback) callback(reader.result);
  };
  reader.readAsDataURL(fileOrData);
}
function clearCharacterImage(charId, slot) {
  var state = loadState();
  state.images = state.images || {};
  delete state.images[imageKey(charId, slot)];
  saveState(state);
}
function getCharacterImageUrl(charId, slot) {
  var state = loadState();
  return (state.images && state.images[imageKey(charId, slot)]) || null;
}

export { imageKey, setCharacterImage, clearCharacterImage, getCharacterImageUrl };
