import { normalizeJob, makePlaceholderPng } from './utils.js';

var STORAGE_KEY = "chara_db_v2";

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var state = JSON.parse(raw);
      state.jobs = (state.jobs || []).map(normalizeJob);
      return state;
    }
  } catch (e) {}
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedExamples(force) {
  var state = loadState();
  if (!force && (state.seeded || state.characters.length || state.jobs.length)) {
    return false;
  }
  state.jobs = [
    {
      id: 1,
      school: "History of art",
      degree: "critic",
      career: "critic of art",
      comment: "Gallery and museum reviews",
    },
    {
      id: 2,
      school: "Music academy",
      degree: "critic",
      career: "critic of music",
      comment: "Live concerts and recordings",
    },
    {
      id: 3,
      school: "Culinary institute",
      degree: "critic",
      career: "critic of meal",
      comment: "Restaurants and street food",
    },
  ];
  state.characters = [
    {
      id: 1, ready: true, name: "Mira", last_name: "Voss",
      birthday: "1998-03-15", constellation: "Pisces", height: "168 cm",
      team_club: "Silver Pen", job_id: 1,
      skills: "Composition, color theory", hobby: "Gallery hopping", weakness: "Spicy food",
    },
    {
      id: 2, ready: false, name: "Leo", last_name: "Kade",
      birthday: "07-22", constellation: "Cancer", height: "175 cm",
      team_club: "Night Review", job_id: 2,
      skills: "Piano, live mixing", hobby: "Vinyl collecting", weakness: "Morning shifts",
    },
    {
      id: 3, ready: true, name: "Suri", last_name: "Bell",
      birthday: "11-03", constellation: "Scorpio", height: "162 cm",
      team_club: "Table Nine", job_id: 3,
      skills: "Tasting notes, plating", hobby: "Street food tours", weakness: "Loud kitchens",
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

export { STORAGE_KEY, loadState, saveState, seedExamples };
