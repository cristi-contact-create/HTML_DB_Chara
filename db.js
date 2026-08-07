// Chara DB — localStorage backend (no server required)
const STORAGE_KEY = "chara_db_v2";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Could not read storage", e);
  }
  return {
    jobs: [],
    characters: [],
    images: {},
    nextJobId: 1,
    nextCharId: 1,
    seeded: false,
  };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error("Could not save storage", e);
    throw new Error(
      "Could not save — browser storage is full or blocked. Try Chrome/Edge and allow storage."
    );
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function makePlaceholderPng(label, bg = "#5a7ae0") {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 72px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.slice(0, 1).toUpperCase(), 100, 108);
  return canvas.toDataURL("image/png");
}

async function listJobs() {
  const state = loadState();
  return [...state.jobs].sort((a, b) => a.title.localeCompare(b.title));
}

async function getJob(id) {
  return loadState().jobs.find((j) => j.id === id) || null;
}

async function createJob({ school, title }) {
  const state = loadState();
  const job = {
    id: state.nextJobId++,
    school: school ?? null,
    title: title.trim(),
  };
  state.jobs.push(job);
  saveState(state);
  return job;
}

async function updateJob(id, { school, title }) {
  const state = loadState();
  const job = state.jobs.find((j) => j.id === id);
  if (!job) throw new Error("Job not found");
  if (school !== undefined) job.school = school;
  if (title !== undefined) job.title = title.trim();
  saveState(state);
  return job;
}

async function deleteJob(id) {
  const state = loadState();
  state.jobs = state.jobs.filter((j) => j.id !== id);
  for (const c of state.characters) {
    if (c.job_id === id) c.job_id = null;
  }
  saveState(state);
}

async function listCharacters() {
  const state = loadState();
  return [...state.characters].sort((a, b) => {
    const ln = a.last_name.localeCompare(b.last_name);
    return ln !== 0 ? ln : a.name.localeCompare(b.name);
  });
}

async function getCharacter(id) {
  return loadState().characters.find((c) => c.id === id) || null;
}

async function createCharacter(data) {
  const state = loadState();
  const record = {
    id: state.nextCharId++,
    ready: !!data.ready,
    name: data.name.trim(),
    last_name: data.last_name.trim(),
    birthday: data.birthday ?? null,
    constellation: data.constellation ?? null,
    height: data.height ?? null,
    team_club: data.team_club ?? null,
    job_id: data.job_id ?? null,
    skills: data.skills ?? null,
    hobby: data.hobby ?? null,
    weakness: data.weakness ?? null,
  };
  state.characters.push(record);
  saveState(state);
  return record;
}

async function updateCharacter(id, data) {
  const state = loadState();
  const c = state.characters.find((x) => x.id === id);
  if (!c) throw new Error("Character not found");
  const fields = [
    "ready",
    "name",
    "last_name",
    "birthday",
    "constellation",
    "height",
    "team_club",
    "job_id",
    "skills",
    "hobby",
    "weakness",
  ];
  for (const key of fields) {
    if (data[key] !== undefined) c[key] = data[key];
  }
  if (typeof c.name === "string") c.name = c.name.trim();
  if (typeof c.last_name === "string") c.last_name = c.last_name.trim();
  saveState(state);
  return c;
}

function imageKey(charId, slot) {
  return `${charId}_${slot}`;
}

async function setCharacterImage(charId, slot, blobOrFile) {
  const dataUrl = await blobToDataUrl(blobOrFile);
  const state = loadState();
  state.images[imageKey(charId, slot)] = dataUrl;
  saveState(state);
}

async function clearCharacterImage(charId, slot) {
  const state = loadState();
  delete state.images[imageKey(charId, slot)];
  saveState(state);
}

async function getCharacterImageUrl(charId, slot) {
  const state = loadState();
  return state.images[imageKey(charId, slot)] || null;
}

async function getCharacterImageBlob(charId, slot) {
  const url = await getCharacterImageUrl(charId, slot);
  if (!url) return null;
  const res = await fetch(url);
  return res.blob();
}

async function deleteCharacterImages(charId) {
  const state = loadState();
  delete state.images[imageKey(charId, 1)];
  delete state.images[imageKey(charId, 2)];
  saveState(state);
}

async function deleteCharacter(id) {
  const state = loadState();
  state.characters = state.characters.filter((c) => c.id !== id);
  delete state.images[imageKey(id, 1)];
  delete state.images[imageKey(id, 2)];
  saveState(state);
}

async function charactersForJob(jobId) {
  return (await listCharacters()).filter((c) => c.job_id === jobId);
}

async function testStorage() {
  const probe = "__chara_probe__";
  localStorage.setItem(probe, "1");
  localStorage.removeItem(probe);
  return true;
}

async function seedExamples(force = false) {
  const state = loadState();
  if (!force && (state.seeded || state.characters.length > 0 || state.jobs.length > 0)) {
    return false;
  }

  state.jobs = [
    { id: 1, school: "critic", title: "critic of art" },
    { id: 2, school: "critic", title: "critic of music" },
    { id: 3, school: "critic", title: "critic of meal" },
  ];
  state.characters = [
    {
      id: 1,
      ready: true,
      name: "Mira",
      last_name: "Voss",
      birthday: "1998-03-15",
      constellation: "Pisces",
      height: "168 cm",
      team_club: "Silver Pen",
      job_id: 1,
      skills: "Composition, color theory",
      hobby: "Gallery hopping",
      weakness: "Spicy food",
    },
    {
      id: 2,
      ready: false,
      name: "Leo",
      last_name: "Kade",
      birthday: "2001-07-22",
      constellation: "Cancer",
      height: "175 cm",
      team_club: "Night Review",
      job_id: 2,
      skills: "Piano, live mixing",
      hobby: "Vinyl collecting",
      weakness: "Morning shifts",
    },
    {
      id: 3,
      ready: true,
      name: "Suri",
      last_name: "Bell",
      birthday: "1999-11-03",
      constellation: "Scorpio",
      height: "162 cm",
      team_club: "Table Nine",
      job_id: 3,
      skills: "Tasting notes, plating",
      hobby: "Street food tours",
      weakness: "Loud kitchens",
    },
  ];
  state.nextJobId = 4;
  state.nextCharId = 4;
  state.seeded = true;
  state.images = {
    "1_1": makePlaceholderPng("M", "#7c9cff"),
    "2_1": makePlaceholderPng("L", "#5dd39e"),
    "3_1": makePlaceholderPng("S", "#f0a060"),
  };
  saveState(state);
  return true;
}

async function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
}

window.charaDb = {
  listJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  listCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  setCharacterImage,
  clearCharacterImage,
  getCharacterImageBlob,
  getCharacterImageUrl,
  charactersForJob,
  testStorage,
  seedExamples,
  resetAllData,
};
