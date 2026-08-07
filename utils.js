// Utility helpers (shared)
var MAX_JOB_CHARS_SHOWN = 8;

function $(sel, root) {
  return (root || document).querySelector(sel);
}
function $$(sel, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(sel));
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function nullable(v) {
  var t = String(v).trim();
  return t || null;
}
function fullName(c) {
  return (c.name + " " + c.last_name).trim();
}

function makePlaceholderPng(label, bg) {
  var canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = bg || "#5a7ae0";
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 72px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.charAt(0).toUpperCase(), 100, 108);
  return canvas.toDataURL("image/png");
}

function formatBirthday(b) {
  // Return birthday as two-digit day, dash, and full month name in lowercase: "03 - march"
  if (!b) return null;
  try {
    var parts = String(b).split("-");
    if (parts.length < 2) return null;
    // Expecting ISO YYYY-MM-DD; parts[1]=MM, parts[2]=DD
    var monthNum = parseInt(parts[1], 10);
    var day = parts[2] || '';
    if (day && day.length > 2) day = day.slice(-2);
    // zero-pad day
    if (day) day = day.padStart(2, '0');
    var monthsFull = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var m = monthsFull[(monthNum - 1 + 12) % 12] || "";
    if (!day && m) return m;
    if (!m && day) return day;
    if (!day && !m) return null;
    return (day ? day : '') + (m ? ' - ' + m : '');
  } catch (err) { return null; }
}

function degreeHue(degree) {
  if (!degree) return 220;
  var hash = 0;
  var s = String(degree).toLowerCase();
  for (var i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
function degreeColors(degree) {
  var h = degreeHue(degree);
  return {
    border: "hsl(" + h + ", 72%, 58%)",
    bg: "hsla(" + h + ", 70%, 52%, 0.14)",
    chipBg: "hsla(" + h + ", 75%, 55%, 0.22)",
    text: "hsl(" + h + ", 80%, 72%)",
    glow: "hsla(" + h + ", 80%, 55%, 0.45)",
  };
}
function degreeChipStyle(degree) {
  var c = degreeColors(degree);
  return (
    "border-color:" + c.border + ";background:" + c.chipBg + ";box-shadow:0 0 8px " + c.glow
  );
}

function photoButtonHtml(url, name, className, focus) {
  var imgStyle = focus ? ' style="object-position:' + focus + ';"' : '';
  return (
    '<button type="button" class="' + className + '" data-photo="' + url + '" data-name="' + escapeHtml(name) + '" title="View larger">' +
    '<img src="' + url + '" alt=""' + imgStyle + ' /></button>'
  );
}

// normalize job helper (moved here to avoid circular imports)
function normalizeJob(j) {
  j = j || {};
  if (!j.career && j.title) {
    j.career = j.title;
    if (!j.degree && j.school) {
      j.degree = j.school;
      j.school = null;
    }
  }
  if (j.comment == null) j.comment = null;
  if (j.degree == null) j.degree = null;
  return j;
}

// icon rendering
var _iconShapes = ["star", "heart", "sphere", "note"];
var _iconColors = [
  "#ff6b6b","#f06595","#845ef7","#5c7cfa","#339af0","#22b8cf",
  "#20c997","#51cf66","#94d82d","#fab005","#ff922b","#ff6b00",
  "#d9480f","#f783ac","#d6336c","#a61eea","#748ffc"
];

function renderIconSvg(spec, size) {
  var parts = String(spec || "").split("|");
  var shape = parts[0] || "star";
  var color = parts[1] || "#7c9cff";
  var s = size || 20;
  if (shape === "star") {
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path fill="' + color + '" d="M12 .587l3.668 7.431L23 9.748l-5.5 5.36L18.335 24 12 20.013 5.665 24 6.5 15.108 1 9.748l7.332-1.73L12 .587z"/></svg>';
  }
  if (shape === "heart") {
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path fill="' + color + '" d="M12 21s-7.33-4.873-9.11-7.01C.86 11.97 3.755 6 8.5 6 10.86 6 12 8.09 12 8.09S13.14 6 15.5 6C20.245 6 23.14 11.97 21.11 13.99 19.33 16.127 12 21 12 21z"/></svg>';
  }
  if (shape === "sphere") {
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9" fill="' + color + '" /></svg>';
  }
  return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path fill="' + color + '" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>';
}
function renderStatusIcon(spec) {
  if (!spec) return "";
  return '<span class="card-status-icon">' + renderIconSvg(spec, 14) + '</span>';
}

export { MAX_JOB_CHARS_SHOWN, $, $$, escapeHtml, nullable, fullName, makePlaceholderPng, formatBirthday, degreeHue, degreeColors, degreeChipStyle, photoButtonHtml, _iconShapes, _iconColors, renderIconSvg, renderStatusIcon, normalizeJob };