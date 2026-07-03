/* ============================================================
   Sciovia — membership card generator (client-side, no backend)
   Generates a stable member number from the member's email and
   renders a downloadable membership card on a canvas.
   ============================================================ */

const CONTACT_EMAIL = "vinitkumargunjan@gmail.com"; // register mailbox — change to hello@sciovia.org later
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

async function drawCard(canvas, data) {
  const W = 1012, H = 638;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // background
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0c332e"); g.addColorStop(0.55, "#14524b"); g.addColorStop(1, "#186056");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // watermark compass
  ctx.save(); ctx.globalAlpha = 0.06; drawCompass(ctx, W - 120, H - 70, 420, PALETTE); ctx.restore();

  // gold inner border
  ctx.strokeStyle = "rgba(224,166,72,0.5)"; ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  const PAD = 56;
  // header: compass + wordmark
  drawCompass(ctx, PAD + 34, 88, 76, PALETTE);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#faf7f1"; ctx.letterSpacing = "2px";
  ctx.font = "600 46px Fraunces, Georgia, serif";
  ctx.fillText("Sciovia", PAD + 88, 104);
  // right label
  ctx.letterSpacing = "4px"; ctx.textAlign = "right";
  ctx.fillStyle = "#e0a648"; ctx.font = "600 18px Inter, Arial, sans-serif";
  ctx.fillText("MEMBERSHIP CARD", W - PAD, 82);
  ctx.textAlign = "left";

  // divider
  ctx.strokeStyle = "rgba(224,166,72,0.35)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD, 150); ctx.lineTo(W - PAD, 150); ctx.stroke();

  const label = (t, x, y) => {
    ctx.letterSpacing = "2px"; ctx.fillStyle = "#e0a648";
    ctx.font = "600 16px Inter, Arial, sans-serif"; ctx.fillText(t, x, y);
  };
  const value = (t, x, y, size, mono) => {
    ctx.letterSpacing = mono ? "1px" : "0px"; ctx.fillStyle = "#faf7f1";
    ctx.font = mono ? `500 ${size}px 'Inter', monospace` : fitFont(ctx, t, "Fraunces, Georgia, serif", 600, size, W - PAD - 300);
    ctx.fillText(t, x, y);
  };

  // member name
  label("MEMBER", PAD, 210);
  value(data.name || "—", PAD, 262, 52, false);

  // row: number / category
  label("MEMBERSHIP NO.", PAD, 340);
  value(data.number, PAD, 380, 30, true);
  label("CATEGORY", 470, 340);
  value(data.category || "Member", 470, 380, 28, false);

  // row: affiliation
  label("AFFILIATION", PAD, 448);
  value(data.affiliation || "—", PAD, 486, 26, false);

  // footer: dates
  label("MEMBER SINCE", PAD, 556);
  value(String(JOIN_YEAR), PAD, 592, 24, false);
  label("VALID THROUGH", 320, 556);
  value(`Dec ${JOIN_YEAR + 1}`, 320, 592, 24, false);

  // tagline bottom-right
  ctx.textAlign = "right"; ctx.letterSpacing = "1px";
  ctx.fillStyle = "rgba(250,247,241,0.6)"; ctx.font = "400 20px Fraunces, Georgia, serif";
  ctx.fillText("The path of knowing", W - PAD, 592);
  ctx.textAlign = "left"; ctx.letterSpacing = "0px";
}

/* ---------- wire form ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year"); if (y) y.textContent = JOIN_YEAR;
  document.querySelector(".nav-toggle")?.addEventListener("click", () =>
    document.querySelector(".nav-links")?.classList.toggle("open"));

  const form = document.getElementById("member-form");
  if (!form) return;
  const canvas = document.getElementById("member-card");
  const result = document.getElementById("member-result");
  let current = null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const number = memberNumber(f.get("email"));
    current = {
      name: f.get("name"), email: f.get("email"),
      affiliation: f.get("affiliation"), country: f.get("country"),
      category: f.get("category"), number
    };
    try { await document.fonts.load("600 52px Fraunces"); await document.fonts.load("600 18px Inter"); } catch (e) {}
    await drawCard(canvas, current);
    document.getElementById("member-no-text").textContent = number;
    result.classList.add("show");
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("download-card")?.addEventListener("click", () => {
    if (!current) return;
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sciovia-membership-${current.number}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  });

  document.getElementById("register-btn")?.addEventListener("click", () => {
    if (!current) return;
    const subject = `Sciovia membership register: ${current.name} (${current.number})`;
    const body =
`Please add me to the Sciovia member register.

Member No: ${current.number}
Name: ${current.name}
Email: ${current.email}
Affiliation: ${current.affiliation}
Country: ${current.country}
Category: ${current.category}
Joined: ${JOIN_YEAR}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});
