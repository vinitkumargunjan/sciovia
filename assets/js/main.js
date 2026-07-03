/* ============================================================
   Sciovia — site behaviour
   No backend required. Submissions open a pre-filled email.
   To wire real delivery later, replace CONTACT_EMAIL and/or
   point the Subscribe form at a Substack/Beehiiv URL.
   ============================================================ */

// Where "List an event" and "Subscribe" submissions are sent.
// Change this to a dedicated address (e.g. hello@sciovia.org) once available.
const CONTACT_EMAIL = "vinitkumargunjan@gmail.com";

const CAT_SLUG = {
  "Conference": "conference",
  "Call for Papers": "cfp",
  "Funding": "funding",
  "Position": "position"
};

/* ---------- helpers ---------- */
function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
function esc(s) { return String(s || "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c])); }

function fmtDeadline(iso) {
  if (!iso) return { text: "Open", soon: false };
  const d = new Date(iso + "T00:00:00");
  const opts = { day: "numeric", month: "short", year: "numeric" };
  const days = Math.ceil((d - new Date()) / 86400000);
  return { text: d.toLocaleDateString("en-GB", opts), soon: days >= 0 && days <= 14, passed: days < 0 };
}

function eventCard(ev) {
  const slug = CAT_SLUG[ev.category] || "conference";
  const dl = fmtDeadline(ev.deadline);
  const meta = [
    ev.location ? `<span title="Location">📍 ${esc(ev.location)}</span>` : "",
    ev.mode ? `<span title="Mode">🖥 ${esc(ev.mode)}</span>` : "",
    ev.dates ? `<span title="Dates">🗓 ${esc(ev.dates)}</span>` : ""
  ].join("");
  return el(`
    <article class="ev-card reveal" data-cat="${esc(ev.category)}" data-search="${esc((ev.title + " " + ev.org + " " + ev.location).toLowerCase())}">
      <div class="ev-top">
        <span class="tag tag--${slug}">${esc(ev.category)}</span>
        ${ev.sample ? '<span style="font-size:.7rem;color:#a88;">sample</span>' : ''}
      </div>
      <h3>${esc(ev.title)}</h3>
      <p class="ev-org">${esc(ev.org)}</p>
      <div class="ev-meta">${meta}</div>
      <div class="ev-foot">
        <span class="deadline ${dl.soon ? "soon" : ""}">Deadline: ${dl.text}</span>
        <a class="ev-link" href="${esc(ev.link)}" target="_blank" rel="noopener">Details →</a>
      </div>
    </article>
  `);
}

/* ---------- render events ---------- */
async function loadEvents() {
  const homeWrap = document.getElementById("featured-events");
  const listWrap = document.getElementById("events-grid");
  if (!homeWrap && !listWrap) return;

  let events = [];
  try {
    const res = await fetch("assets/data/events.json", { cache: "no-store" });
    events = await res.json();
  } catch (e) { events = []; }

  // sort by nearest deadline
  events.sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));

  if (homeWrap) {
    events.slice(0, 3).forEach(ev => homeWrap.appendChild(eventCard(ev)));
    observeReveals();
  }

  if (listWrap) {
    if (!events.length) {
      listWrap.appendChild(el('<p class="empty">No opportunities listed yet. Be the first — use the form below to list an event.</p>'));
      return;
    }
    events.forEach(ev => listWrap.appendChild(eventCard(ev)));
    observeReveals();
    wireFilters();
  }
}

/* ---------- filtering + search ---------- */
function wireFilters() {
  const tabs = document.querySelectorAll(".tab");
  const search = document.getElementById("ev-search");
  const cards = () => Array.from(document.querySelectorAll(".ev-card"));
  let activeCat = "All";

  function apply() {
    const q = (search?.value || "").trim().toLowerCase();
    let shown = 0;
    cards().forEach(c => {
      const matchCat = activeCat === "All" || c.dataset.cat === activeCat;
      const matchQ = !q || c.dataset.search.includes(q);
      const show = matchCat && matchQ;
      c.style.display = show ? "" : "none";
      if (show) shown++;
    });
    const empty = document.getElementById("no-results");
    if (empty) empty.style.display = shown ? "none" : "block";
  }

  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    activeCat = t.dataset.cat;
    apply();
  }));
  search?.addEventListener("input", apply);
}

/* ---------- list-an-event form ---------- */
function wireEventForm() {
  const form = document.getElementById("event-form");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(form);
    const subject = `Sciovia — Event submission: ${f.get("title")}`;
    const body =
`Please consider this listing for Sciovia.

Type: ${f.get("category")}
Title: ${f.get("title")}
Organization: ${f.get("org")}
Location / Mode: ${f.get("location")} (${f.get("mode")})
Dates: ${f.get("dates")}
Deadline: ${f.get("deadline")}
Link: ${f.get("link")}

Submitted by: ${f.get("name")} (${f.get("email")})

Notes:
${f.get("notes") || "-"}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const ok = document.getElementById("form-status");
    if (ok) { ok.textContent = "Thank you — your email app should open with the details ready to send."; ok.style.display = "block"; }
  });
}

/* ---------- subscribe form ---------- */
function wireSubscribe() {
  document.querySelectorAll(".subscribe-form").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const email = form.querySelector("input[type=email]").value;
      const subject = "Subscribe to Sciovia";
      const body = `Please add this address to the Sciovia weekly digest:\n\n${email}`;
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const note = form.parentElement.querySelector(".sub-status");
      if (note) { note.textContent = "Thanks! Confirm the email that just opened and you'll be added."; note.style.display = "block"; }
    });
  });
}

/* ---------- reveal on scroll ---------- */
let revealObserver;
function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); revealObserver.unobserve(en.target); } });
    }, { threshold: 0.12 });
  }
  document.querySelectorAll(".reveal:not(.in)").forEach(n => revealObserver.observe(n));
}

/* ---------- mobile nav ---------- */
function wireNav() {
  const btn = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  btn?.addEventListener("click", () => links.classList.toggle("open"));
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();
  wireNav();
  observeReveals();
  loadEvents();
  wireEventForm();
  wireSubscribe();
});
