/* ============================================================
   Sciovia — membership card generator (client-side, no backend)
   Generates a stable member number from the member's email and
   renders a downloadable membership card on a canvas.
   ============================================================ */

const CONTACT_EMAIL = "teamsciovia@gmail.com"; // Sciovia team mailbox
const JOIN_YEAR = new Date().getFullYear();

/* Deterministic member number from email (FNV-1a hash → 6 digits).
   Same email always yields the same number. Not a central registry —
   see the site note about upgrading to a backend for true uniqueness. */
function memberNumber(email) {
  const s = (email || "").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const n = (h >>> 0) % 1000000;
  return `SCV-${JOIN_YEAR}-${String(n).padStart(6, "0")}`;
}

const PALETTE = {
  light: "#f4e7cd", dark: "#b79a63", goldL: "#f0c069", goldD: "#cf9a3a",
  ring: "rgba(244,231,205,0.30)", pin: "#0e3a35", pinStroke: "#f4e7cd"
};

/* draw the faceted compass at (cx,cy) with overall pixel size */
function drawCompass(ctx, cx, cy, size, p) {
  const u = size / 64, C = [0, 0];
  const N = [0, -28], E = [28, 0], S = [0, 28], W = [-28, 0];
  const NE = [6, -6], SE = [6, 6], SW = [-6, 6], NW = [-6, -6];
  const tri = (a, b, fill) => {
    ctx.beginPath();
    ctx.moveTo(cx + a[0] * u, cy + a[1] * u);
    ctx.lineTo(cx + b[0] * u, cy + b[1] * u);
    ctx.lineTo(cx + C[0] * u, cy + C[1] * u);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };
  // ring
  ctx.beginPath(); ctx.arc(cx, cy, 30 * u, 0, Math.PI * 2);
  ctx.strokeStyle = p.ring; ctx.lineWidth = 1.3 * u; ctx.stroke();
  tri(E, NE, p.light); tri(E, SE, p.dark);
  tri(S, SW, p.light); tri(S, SE, p.dark);
  tri(W, NW, p.light); tri(W, SW, p.dark);
  tri(N, NW, p.goldL); tri(N, NE, p.goldD);
  // pivot
  ctx.beginPath(); ctx.arc(cx, cy, 3 * u, 0, Math.PI * 2);
  ctx.fillStyle = p.pin; ctx.fill();
  ctx.lineWidth = 1 * u; ctx.strokeStyle = p.pinStroke; ctx.stroke();
}

function fitFont(ctx, text, family, weight, maxSize, maxWidth) {
  let size = maxSize;
  do { ctx.font = `${weight} ${size}px ${family}`; size -= 2; }
  while (ctx.measureText(text).width > maxWidth && size > 18);
  return ctx.font;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d) { return `${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

/* text set around a circle */
function drawArcText(ctx, text, cx, cy, r, centerDeg, spaceDeg, flip) {
  ctx.save(); ctx.translate(cx, cy);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  let a = centerDeg - ((text.length - 1) * spaceDeg) / 2;
  for (const ch of text) {
    ctx.save();
    ctx.rotate(a * Math.PI / 180);
    ctx.translate(0, -r);
    if (flip) ctx.rotate(Math.PI);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += spaceDeg;
  }
  ctx.restore();
}

/* the Sciovia seal — signature element, distinct from any ID card */
function drawSeal(ctx, cx, cy) {
  const gold = "#e0a648";
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, 120, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, 94, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = gold; ctx.letterSpacing = "1px";
  ctx.font = "600 15px Inter, Arial, sans-serif";
  drawArcText(ctx, "SCIOVIA COMMUNITY", cx, cy, 107, 0, 8.5, false);
  drawArcText(ctx, "THE PATH OF KNOWING", cx, cy, 107, 180, -8.5, true);
  // side diamonds
  [-107, 107].forEach(dx => {
    ctx.save(); ctx.translate(cx + dx, cy); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8); ctx.restore();
  });
  // center compass + year
  drawCompass(ctx, cx, cy - 8, 116, PALETTE);
  ctx.textAlign = "center"; ctx.fillStyle = gold; ctx.letterSpacing = "3px";
  ctx.font = "600 14px Inter, Arial, sans-serif";
  ctx.fillText("EST · 2026", cx, cy + 66);
  ctx.textAlign = "left"; ctx.letterSpacing = "0px";
}

async function drawCard(canvas, data) {
  const W = 1012, H = 638;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // background
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0c332e"); g.addColorStop(0.6, "#123f39"); g.addColorStop(1, "#16564d");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // right seal panel tint + divider
  ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(706, 0, W - 706, H);
  ctx.strokeStyle = "rgba(224,166,72,0.5)"; ctx.lineWidth = 2; ctx.strokeRect(22, 22, W - 44, H - 44);
  ctx.strokeStyle = "rgba(224,166,72,0.28)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(706, 44); ctx.lineTo(706, H - 44); ctx.stroke();

  const PAD = 56;
  ctx.textBaseline = "alphabetic";
  // header
  drawCompass(ctx, PAD + 30, 82, 68, PALETTE);
  ctx.fillStyle = "#faf7f1"; ctx.letterSpacing = "1px";
  ctx.font = "600 40px Fraunces, Georgia, serif";
  ctx.fillText("Sciovia", PAD + 78, 96);
  ctx.letterSpacing = "4px"; ctx.textAlign = "right";
  ctx.fillStyle = "#e0a648"; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("MEMBER PASS", 690, 90); ctx.textAlign = "left";
  ctx.strokeStyle = "rgba(224,166,72,0.30)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(PAD, 130); ctx.lineTo(690, 130); ctx.stroke();

  const label = (t, x, y) => {
    ctx.letterSpacing = "2px"; ctx.fillStyle = "#e0a648";
    ctx.font = "600 15px Inter, Arial, sans-serif"; ctx.fillText(t, x, y);
  };
  const val = (t, x, y, size, mono, max) => {
    ctx.letterSpacing = mono ? "1px" : "0px"; ctx.fillStyle = "#faf7f1";
    ctx.font = mono ? `500 ${size}px 'Inter', monospace`
                    : fitFont(ctx, t, "Fraunces, Georgia, serif", 600, size, max || 360);
    ctx.fillText(t, x, y);
  };

  // name + flourish
  label("MEMBER", PAD, 188);
  val(data.name || "—", PAD, 238, 44, false, 620);
  ctx.strokeStyle = "#e0a648"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(PAD, 256); ctx.lineTo(PAD + 70, 256); ctx.stroke();

  // fields (Sciovia-native labels)
  label("SCIOVIA ID", PAD, 322); val(data.number, PAD, 360, 28, true);
  label("STANDING", 380, 322); val(data.category || "Member", 380, 360, 26, false, 300);
  label("AFFILIATION", PAD, 432); val(data.affiliation || "—", PAD, 470, 24, false, 600);
  label("ISSUED", PAD, 540); val(fmtDate(new Date()), PAD, 576, 22, false, 220);
  label("RENEWS", 300, 540); val(`Dec ${JOIN_YEAR + 1}`, 300, 576, 22, false, 200);

  // seal + verification QR
  drawSeal(ctx, 860, 246);
  drawVerifyQR(ctx, 860, 486, 104, data.number);
  ctx.letterSpacing = "0px"; ctx.textAlign = "left";
}

/* verification QR — links to the Sciovia verify page for this Sciovia ID */
function drawVerifyQR(ctx, cx, cy, size, id) {
  if (typeof qrcode === "undefined") return;
  const url = `https://vinitkumargunjan.github.io/sciovia/verify.html?id=${encodeURIComponent(id)}`;
  const qr = qrcode(0, "M"); qr.addData(url); qr.make();
  const n = qr.getModuleCount(), pad = 9, cell = size / n;
  ctx.fillStyle = "#e0a648"; ctx.textAlign = "center"; ctx.letterSpacing = "2px";
  ctx.font = "600 13px Inter, Arial, sans-serif";
  ctx.fillText("SCAN TO VERIFY", cx, cy - size / 2 - pad - 12);
  ctx.fillStyle = "#f4e7cd";
  ctx.beginPath(); ctx.roundRect(cx - size / 2 - pad, cy - size / 2 - pad, size + pad * 2, size + pad * 2, 10); ctx.fill();
  ctx.fillStyle = "#0e3a35";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (qr.isDark(r, c)) ctx.fillRect(cx - size / 2 + c * cell, cy - size / 2 + r * cell, Math.ceil(cell), Math.ceil(cell));
  ctx.textAlign = "left"; ctx.letterSpacing = "0px";
}

/* ---------- membership application (approval-based) ----------
   Paste your Google Apps Script Web App URL below to record applications
   in your sheet. Until then, the form falls back to opening an email to you. */
const APPLY_ENDPOINT = "https://script.google.com/macros/s/AKfycbyI3mg-sZR5uYdGHDl3t4VvU8raiJHjLEzSSuRPiENBt9bOmZ5Bz0_6fQAVXvt7RXI2Gg/exec";

document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year"); if (y) y.textContent = JOIN_YEAR;
  document.querySelector(".nav-toggle")?.addEventListener("click", () =>
    document.querySelector(".nav-links")?.classList.toggle("open"));

  const form = document.getElementById("apply-form");
  if (!form) return;
  const panel = document.getElementById("apply-panel");
  const done = document.getElementById("apply-done");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const app = Object.fromEntries(new FormData(form).entries());
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Submitting…";

    let sent = false;
    if (APPLY_ENDPOINT) {
      try {
        await fetch(APPLY_ENDPOINT, {
          method: "POST", mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(app)
        });
        sent = true;
      } catch (err) { sent = false; }
    }
    if (!sent) {
      const subject = `Sciovia membership application: ${app.name}`;
      const body =
`New membership application for review.

Name: ${app.name}
Email: ${app.email}
Requested tier: ${app.category}
Affiliation: ${app.affiliation}
Country: ${app.country}
Field / research area: ${app.field}
Profile / homepage: ${app.profile}

Why they'd like to join:
${app.reason || "-"}`;
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    if (panel) panel.style.display = "none";
    if (done) { done.style.display = "block"; done.scrollIntoView({ behavior: "smooth", block: "center" }); }
  });
});
