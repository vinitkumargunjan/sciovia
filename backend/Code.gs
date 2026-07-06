/**
 * Sciovia — membership backend (Google Apps Script)
 * ---------------------------------------------------------------
 * Set this up in the Google account:  teamsciovia@gmail.com
 *
 * What it does:
 *  1. Receives membership applications from the website  -> a Sheet (status "Pending")
 *  2. You review a row and set its Status cell to "Approved"
 *  3. Menu "Sciovia > Send passes to approved members" emails each approved
 *     applicant a welcome message with a link to their Member Pass, and
 *     assigns them the next sequential Sciovia ID (SCV-YYYY-000001, 000002 ...)
 *
 * See backend/SETUP.md for step-by-step setup.
 */

var SHEET_NAME = 'Applications';
var MESSAGES_SHEET = 'Messages';
var CARD_BASE  = 'https://sciovia.org/card.html';
var TEAM_EMAIL = 'teamsciovia@gmail.com';
var FROM_NAME  = 'Sciovia';

var HEADERS = ['Timestamp','Name','Email','Tier','Affiliation','Country',
               'Field','Profile','Reason','Referred by','Status','MemberNo','ProcessedAt','Note'];

// --- Opportunities: managed by section editors in a SEPARATE "Sciovia Opportunities" sheet ---
// tab = the sheet tab an editor works in; category = the value the website filters by.
var OPP_SECTIONS = [
  { tab: 'Conferences & Calls', category: 'Conferences & Calls' },
  { tab: 'Funding',             category: 'Funding' },
  { tab: 'Positions',           category: 'Position' },
  { tab: 'Internships',         category: 'Internship' },
  { tab: 'News & Updates',      category: 'News & Updates' }
];
var OPP_HEADERS = ['Title','Type','Organization','Location','Mode','Dates','Deadline','Link','Published','Added by'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** The website posts applications (and contact messages) to this endpoint. */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.type === 'contact') return handleContact_(d);
    if (d.type === 'subscribe') return handleSubscribe_(d);
    if (d.type === 'submission') return handleSubmission_(d);
    if (d.type === 'nomination') return handleNomination_(d);
    return handleApplication_(d);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** GET: health check, or ?type=opportunities to return published opportunities for the website. */
function doGet(e) {
  if (e && e.parameter && e.parameter.type === 'opportunities') return opportunitiesJson_();
  return json_({ ok: true, service: 'sciovia-membership' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Contact-form messages -> a Messages sheet + an email to the team. */
function messagesSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(MESSAGES_SHEET);
  if (!sh) {
    sh = ss.insertSheet(MESSAGES_SHEET);
    sh.appendRow(['Timestamp', 'Name', 'Email', 'Subject', 'Message']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Newsletter subscribers -> a Subscribers sheet. */
function tab_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}

function handleSubscribe_(d) {
  tab_('Subscribers', ['Timestamp', 'Email', 'Source']).appendRow([new Date(), d.email || '', d.source || 'website']);
  return json_({ ok: true });
}

/** Public "list an event" submissions -> a Submissions sheet (for an editor to review). */
function handleSubmission_(d) {
  tab_('Submissions', ['Timestamp', 'Type', 'Title', 'Organization', 'Location', 'Mode', 'Dates', 'Deadline', 'Link', 'Submitter', 'Email', 'Notes'])
    .appendRow([new Date(), d.category || '', d.title || '', d.org || '', d.location || '', d.mode || '', d.dates || '', d.deadline || '', d.link || '', d.name || '', d.email || '', d.notes || '']);
  return json_({ ok: true });
}

/** Awards nomination -> Nominations tab. */
function handleNomination_(d) {
  tab_('Nominations', ['Timestamp', 'Award', 'Nominee', 'Affiliation', 'Reason', 'Link', 'Nominator', 'Nominator email', 'Nominator member no'])
    .appendRow([new Date(), d.award || '', d.nominee || '', d.affiliation || '', d.reason || '', d.link || '', d.name || '', d.email || '', d.memberNo || '']);
  return json_({ ok: true });
}

/** Membership application -> Applications tab (header-aware, records optional "Referred by"). */
function handleApplication_(d) {
  var sh = sheet_();
  ensureCol_(sh, 'Referred by');
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var map = {
    'Timestamp': new Date(),
    'Name': d.name || '', 'Email': d.email || '', 'Tier': d.category || '',
    'Affiliation': d.affiliation || '', 'Country': d.country || '',
    'Field': d.field || '', 'Profile': d.profile || '', 'Reason': d.reason || '',
    'Referred by': d.referredBy || '', 'Status': 'Pending'
  };
  var row = headers.map(function (h) { return (map[h] !== undefined) ? map[h] : ''; });
  sh.appendRow(row);
  return json_({ ok: true });
}

function handleContact_(d) {
  messagesSheet_().appendRow([new Date(), d.name || '', d.email || '', d.subject || '', d.message || '']);
  MailApp.sendEmail({
    to: TEAM_EMAIL,
    name: FROM_NAME,
    replyTo: d.email || TEAM_EMAIL,
    subject: 'Sciovia contact: ' + (d.subject || '(no subject)'),
    body: 'From: ' + (d.name || '') + ' <' + (d.email || '') + '>\n\n' + (d.message || '')
  });
  return json_({ ok: true });
}

function opportunitiesJson_() { return json_(getOpportunities_()); }

/** Reads all "Published" opportunities from every section tab as an array.
 *  Listings whose deadline has passed are automatically hidden (rolling ones stay). */
function getOpportunities_() {
  var ss = getOppSheet_();
  if (!ss) return [];
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var out = [];
  OPP_SECTIONS.forEach(function (sec) {
    var sh = ss.getSheetByName(sec.tab);
    if (!sh || sh.getLastRow() < 2) return;
    var rows = sh.getDataRange().getValues();
    var h = rows[0], idx = {};
    OPP_HEADERS.forEach(function (col) { idx[col] = h.indexOf(col); });
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var pub = r[idx['Published']];
      var isPub = (pub === true) || String(pub).toUpperCase() === 'TRUE' || String(pub).toLowerCase() === 'yes';
      if (!isPub || !r[idx['Title']]) continue;
      var dl = fmtDate_(r[idx['Deadline']]);
      if (dl && dl < today) continue;   // auto-hide once the deadline has passed
      out.push({
        category: sec.category,
        type: r[idx['Type']] || '',
        title: r[idx['Title']] || '',
        org: r[idx['Organization']] || '',
        location: r[idx['Location']] || '',
        mode: r[idx['Mode']] || '',
        dates: r[idx['Dates']] || '',
        deadline: dl,
        link: r[idx['Link']] || ''
      });
    }
  });
  return out;
}

function fmtDate_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2) + '-' + ('0' + v.getDate()).slice(-2);
  }
  return String(v);
}

function getOppSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('OPP_SHEET_ID');
  if (!id) return null;
  try { return SpreadsheetApp.openById(id); } catch (e) { return null; }
}

/** Run ONCE from the Sciovia menu: creates the "Sciovia Opportunities" sheet with the five
 *  section tabs (seeded with the current listings). Then Share it with your section editors. */
function setupOpportunitiesSheet() {
  var props = PropertiesService.getScriptProperties();
  var ss = getOppSheet_();
  if (!ss) {
    ss = SpreadsheetApp.create('Sciovia Opportunities');
    props.setProperty('OPP_SHEET_ID', ss.getId());
  }
  OPP_SECTIONS.forEach(function (sec) {
    var sh = ss.getSheetByName(sec.tab);
    if (!sh) sh = ss.insertSheet(sec.tab);
    if (sh.getLastRow() === 0) {
      sh.appendRow(OPP_HEADERS);
      sh.setFrozenRows(1);
      sh.getRange(2, 9, 800, 1).insertCheckboxes();            // Published column
      sh.getRange(2, 7, 800, 1).setNumberFormat('yyyy-mm-dd'); // Deadline column
      (OPP_SEED[sec.tab] || []).forEach(function (row) { sh.appendRow(row); });
    }
  });
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > OPP_SECTIONS.length) { try { ss.deleteSheet(def); } catch (e) {} }
  SpreadsheetApp.getUi().alert('Sciovia Opportunities',
    'Ready. Open this sheet and Share it with your section editors:\n\n' + ss.getUrl(),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

// Seed rows: [Title, Type, Organization, Location, Mode, Dates, Deadline, Link, Published, Added by]
var OPP_SEED = {
  'Conferences & Calls': [
    ['AAAI-27 — 41st AAAI Conference on Artificial Intelligence', 'Conference · Call for Papers', 'Association for the Advancement of Artificial Intelligence', 'Montréal, Canada', 'In-person', '16–23 Feb 2027', '2026-07-28', 'https://aaai.org/conference/aaai/aaai-27/main-technical-track-call/', true, 'Sciovia'],
    ['Special Issue: Large Language Models — IEEE Transactions on Computers', 'Journal Special Issue', 'IEEE Computer Society', 'Online', 'Remote', 'Publication 2027', '2026-07-15', 'https://www.computer.org/publications/author-resources/calls-for-papers', true, 'Sciovia']
  ],
  'Funding': [
    ['MSCA Postdoctoral Fellowships 2026 (€399M, ~1,600 awards)', 'Fellowship', 'Marie Skłodowska-Curie Actions · European Commission', 'Europe / Global', 'On-site', 'Fellowships up to 24 months', '2026-09-09', 'https://marie-sklodowska-curie-actions.ec.europa.eu/actions/postdoctoral-fellowships', true, 'Sciovia']
  ],
  'Positions': [
    ['Fully funded PhD & postdoctoral positions across Europe', '', 'EURAXESS · European Commission', 'Europe', 'On-site', 'Rolling · new posts weekly', '', 'https://euraxess.ec.europa.eu/jobs/search', true, 'Sciovia']
  ],
  'Internships': [
    ['Student Research Internships & Programs', '', 'Google Research', 'Global', 'Hybrid', 'Rolling · reviewed continuously', '', 'https://research.google/programs-and-events/student-engagement/', true, 'Sciovia']
  ],
  'News & Updates': [
    ["ANRF is now India's national research funder (subsumes SERB)", '', 'Anusandhan National Research Foundation · Govt. of India', 'India', '', 'Ongoing', '', 'https://anrfonline.in/', true, 'Sciovia']
  ]
};

/* ============================ NEWSLETTER ============================ */

var NEWSLETTER_SHEET = 'Newsletter';

/** Creates/returns the "Newsletter" tab (a simple Field/Value editor for each issue). */
function newsletterConfig_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(NEWSLETTER_SHEET);
  if (!sh) {
    sh = ss.insertSheet(NEWSLETTER_SHEET);
    sh.getRange(1, 1, 1, 2).setValues([['Field', 'Value']]);
    sh.appendRow(['Issue label', 'Issue 1 · ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM yyyy')]);
    sh.appendRow(['Intro', "Welcome to this week's Sciovia digest — a short, curated round-up of opportunities worth your time."]);
    sh.appendRow(['Researcher of the Week', '']);
    sh.appendRow(['Practical Tip', '']);
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 180); sh.setColumnWidth(2, 560);
  }
  return sh;
}

function newsletterValues_() {
  var sh = newsletterConfig_();
  var v = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 2).getValues();
  var map = {};
  v.forEach(function (r) { if (r[0]) map[String(r[0]).trim()] = String(r[1] || ''); });
  return map;
}

function subscribersEmails_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Subscribers');
  if (!sh || sh.getLastRow() < 2) return [];
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var ei = headers.indexOf('Email'); if (ei === -1) ei = 1;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  var seen = {}, out = [];
  vals.forEach(function (r) {
    var e = String(r[ei] || '').trim().toLowerCase();
    if (e && e.indexOf('@') > 0 && !seen[e]) { seen[e] = 1; out.push(e); }
  });
  return out;
}

function buildNewsletterHtml_() {
  var cfg = newsletterValues_();
  var opps = getOpportunities_().sort(function (a, b) {
    return String(a.deadline || '9999').localeCompare(String(b.deadline || '9999'));
  });
  var order = ['Conferences & Calls', 'Funding', 'Position', 'Internship', 'News & Updates'];
  var labels = { 'Position': 'Positions', 'Internship': 'Internships' };
  var sections = '';
  order.forEach(function (cat) {
    var items = opps.filter(function (o) { return o.category === cat; }).slice(0, 4);
    if (!items.length) return;
    var rows = items.map(function (o) {
      var dl = o.deadline ? ' · Deadline: ' + o.deadline : '';
      return '<p style="margin:0 0 12px"><a href="' + o.link + '" style="color:#14524b;font-weight:bold;text-decoration:none">' +
        esc_(o.title) + '</a><br><span style="color:#5f716f;font-size:13px">' + esc_(o.org) + dl + '</span></p>';
    }).join('');
    sections += '<h3 style="font-family:Georgia,serif;color:#14524b;margin:22px 0 10px;border-bottom:1px solid #e7e1d5;padding-bottom:6px">' +
      esc_(labels[cat] || cat) + '</h3>' + rows;
  });
  var extra = '';
  if (cfg['Researcher of the Week']) extra += '<h3 style="font-family:Georgia,serif;color:#14524b;margin:22px 0 10px">Researcher of the Week</h3><p style="color:#333">' + esc_(cfg['Researcher of the Week']) + '</p>';
  if (cfg['Practical Tip']) extra += '<h3 style="font-family:Georgia,serif;color:#14524b;margin:22px 0 10px">One Practical Tip</h3><p style="color:#333">' + esc_(cfg['Practical Tip']) + '</p>';
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1a2a2a">' +
    '<div style="background:#14524b;padding:24px 28px;border-radius:12px 12px 0 0">' +
      '<div style="font-size:24px;font-family:Georgia,serif;color:#faf7f1">Sciovia</div>' +
      '<div style="font-size:12px;color:#e0a648;letter-spacing:3px">THE PATH OF KNOWING · ' + esc_(cfg['Issue label'] || '') + '</div></div>' +
    '<div style="border:1px solid #e7e1d5;border-top:none;border-radius:0 0 12px 12px;padding:26px 28px">' +
      (cfg['Intro'] ? '<p style="font-size:15px;color:#333">' + esc_(cfg['Intro']) + '</p>' : '') +
      sections + extra +
      '<hr style="border:none;border-top:1px solid #e7e1d5;margin:24px 0">' +
      '<p style="font-size:13px;color:#5f716f">Browse everything at <a href="https://sciovia.org/opportunities.html" style="color:#14524b">sciovia.org</a>.</p>' +
      '<p style="font-size:12px;color:#5f716f">You are receiving this because you subscribed at sciovia.org. To unsubscribe, <a href="mailto:hello@sciovia.org?subject=Unsubscribe" style="color:#5f716f">click here</a>.<br>An initiative of the Sciovia Managing Committee · Independent &amp; non-commercial · hello@sciovia.org</p>' +
    '</div></div>';
}

function setupNewsletter() {
  var sh = newsletterConfig_();
  SpreadsheetApp.getUi().alert('Sciovia Newsletter',
    'The "Newsletter" tab is ready. Edit the Issue label, Intro, Researcher of the Week, and Practical Tip there — the opportunities are pulled in automatically. Then use "Send test to me", and "Send to all subscribers".',
    SpreadsheetApp.getUi().ButtonSet.OK);
  sh.activate();
}

/** Sends the composed digest only to the team address, for a preview. */
function sendNewsletterTest() {
  MailApp.sendEmail({
    to: TEAM_EMAIL, name: FROM_NAME,
    subject: 'Sciovia digest (TEST) — ' + (newsletterValues_()['Issue label'] || ''),
    htmlBody: buildNewsletterHtml_()
  });
  SpreadsheetApp.getUi().alert('Sciovia', 'Test digest sent to ' + TEAM_EMAIL + '. Review it, then use "Send to all subscribers".',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/** Sends the digest to every subscriber (respects the free Gmail daily quota). */
function sendNewsletter() {
  var ui = SpreadsheetApp.getUi();
  var subs = subscribersEmails_();
  if (!subs.length) { ui.alert('Sciovia', 'No subscribers yet.', ui.ButtonSet.OK); return; }
  var quota = MailApp.getRemainingDailyQuota();
  if (quota < subs.length) {
    ui.alert('Sciovia', 'Not enough email quota today: ' + quota + ' left, but ' + subs.length + ' subscribers. ' +
      'Free Gmail allows ~100/day — send the rest tomorrow, or move to a bulk sender (Substack/Beehiiv) as you grow.', ui.ButtonSet.OK);
    return;
  }
  var resp = ui.alert('Send newsletter', 'Send this issue to ' + subs.length + ' subscriber(s)?\n(Send a test to yourself first if you have not.)', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;
  var html = buildNewsletterHtml_();
  var subject = 'Sciovia digest — ' + (newsletterValues_()['Issue label'] || '');
  var sent = 0;
  subs.forEach(function (email) {
    try { MailApp.sendEmail({ to: email, name: FROM_NAME, replyTo: TEAM_EMAIL, subject: subject, htmlBody: html }); sent++; } catch (e) {}
  });
  ui.alert('Sciovia', sent + ' newsletter email(s) sent.', ui.ButtonSet.OK);
}

/* ==================== OPPORTUNITY SUGGESTIONS (RSS) ==================== */
// Pulls items from RSS/Atom feeds into a "Suggestions" tab for editors to review.
// Nothing is auto-published — an editor still copies good ones into their section.

var FEEDS_TAB = 'Feeds';
var SUGGESTIONS_TAB = 'Suggestions';

function fetchSuggestions() {
  var ss = getOppSheet_();
  if (!ss) { maybeAlert_('Run "Set up Opportunities sheet" first.'); return; }

  var feeds = ss.getSheetByName(FEEDS_TAB);
  if (!feeds) {
    feeds = ss.insertSheet(FEEDS_TAB);
    feeds.appendRow(['Section', 'Feed URL', 'Source']);
    [
      ['Conferences & Calls', 'http://www.wikicfp.com/cfp/rss?cat=artificial%20intelligence', 'WikiCFP · AI'],
      ['Conferences & Calls', 'http://www.wikicfp.com/cfp/rss?cat=machine%20learning', 'WikiCFP · Machine Learning'],
      ['Conferences & Calls', 'http://www.wikicfp.com/cfp/rss?cat=deep%20learning', 'WikiCFP · Deep Learning'],
      ['Conferences & Calls', 'http://www.wikicfp.com/cfp/rss?cat=data%20mining', 'WikiCFP · Data Mining'],
      ['Conferences & Calls', 'http://www.wikicfp.com/cfp/rss?cat=data%20science', 'WikiCFP · Data Science'],
      ['Conferences & Calls', 'http://www.wikicfp.com/cfp/rss?cat=computer%20vision', 'WikiCFP · Computer Vision'],
      ['Conferences & Calls', 'http://www.wikicfp.com/cfp/rss?cat=internet%20of%20things', 'WikiCFP · IoT'],
      ['Conferences & Calls', 'http://www.wikicfp.com/cfp/rss?cat=image%20processing', 'WikiCFP · Image Processing']
    ].forEach(function (s) { feeds.appendRow(s); });
    feeds.setFrozenRows(1); feeds.setColumnWidth(2, 460);
  }
  var sug = ss.getSheetByName(SUGGESTIONS_TAB);
  if (!sug) {
    sug = ss.insertSheet(SUGGESTIONS_TAB);
    sug.appendRow(['Found', 'Section', 'Title', 'Link', 'Source']);
    sug.setFrozenRows(1); sug.setColumnWidth(3, 380); sug.setColumnWidth(4, 320);
  }

  var seen = {};
  if (sug.getLastRow() > 1) {
    sug.getRange(2, 4, sug.getLastRow() - 1, 1).getValues().forEach(function (r) { if (r[0]) seen[String(r[0]).trim()] = 1; });
  }
  var feedRows = feeds.getLastRow() > 1 ? feeds.getRange(2, 1, feeds.getLastRow() - 1, 3).getValues() : [];
  var newRows = [];
  feedRows.forEach(function (fr) {
    var section = fr[0], url = String(fr[1] || '').trim(), source = fr[2] || '';
    if (!url) return;
    try {
      parseFeed_(url).slice(0, 15).forEach(function (it) {
        if (it.link && !seen[it.link]) { seen[it.link] = 1; newRows.push([new Date(), section, it.title, it.link, source]); }
      });
    } catch (e) { /* skip a broken feed */ }
  });
  if (newRows.length) sug.getRange(sug.getLastRow() + 1, 1, newRows.length, 5).setValues(newRows);
  maybeAlert_(newRows.length + ' new suggestion(s) added to the "Suggestions" tab for review.');
  try { sug.activate(); } catch (e) {}
}

function parseFeed_(url) {
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  var xml = XmlService.parse(res.getContentText());
  var root = xml.getRootElement(), out = [];
  var channel = root.getChild('channel');
  if (channel) { // RSS 2.0
    channel.getChildren('item').forEach(function (it) {
      out.push({ title: txt_(it.getChild('title')), link: txt_(it.getChild('link')) });
    });
    return out;
  }
  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom'); // Atom
  root.getChildren('entry', atom).forEach(function (en) {
    var links = en.getChildren('link', atom), link = '';
    if (links.length && links[0].getAttribute('href')) link = links[0].getAttribute('href').getValue();
    out.push({ title: txt_(en.getChild('title', atom)), link: link });
  });
  return out;
}

function txt_(el) { return el ? el.getText().trim() : ''; }

function maybeAlert_(msg) {
  try { SpreadsheetApp.getUi().alert('Sciovia', msg, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { Logger.log(msg); } // running from a time trigger — no UI
}

/* ==================================================================== */

/** Adds the Sciovia menu when the sheet opens. */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Sciovia')
    .addItem('Process applications (approve / decline)', 'processApplications')
    .addItem('Set up Opportunities sheet', 'setupOpportunitiesSheet')
    .addItem('Fetch opportunity suggestions (RSS)', 'fetchSuggestions')
    .addSubMenu(ui.createMenu('Newsletter')
      .addItem('Set up newsletter tab', 'setupNewsletter')
      .addItem('Send test to me', 'sendNewsletterTest')
      .addItem('Send to all subscribers', 'sendNewsletter'))
    .addToUi();
}

/** Ensures a header column exists on a sheet; adds it at the end if missing. */
function ensureCol_(sh, name) {
  var last = Math.max(1, sh.getLastColumn());
  var headers = sh.getRange(1, 1, 1, last).getValues()[0];
  if (headers.indexOf(name) === -1) sh.getRange(1, last + 1).setValue(name);
}

/**
 * Processes membership applications:
 *  - Status "Approved"  -> assigns a Sciovia ID and emails the Member Pass welcome.
 *  - Status "Rejected"  -> emails a courteous decline (with the reason from the "Note" column).
 * Set the Status cell, then run this from the Sciovia menu.
 */
function processApplications() {
  var sh = sheet_();
  ensureCol_(sh, 'Note');                       // where you type a decline reason
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var c = {};
  headers.forEach(function (h, i) { c[h] = i; });

  var rows = values.slice(1);
  var year = new Date().getFullYear();
  var max = 0;
  rows.forEach(function (r) {
    var m = String(r[c.MemberNo] || '').match(/SCV-\d{4}-(\d{6})/);
    if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
  });

  var approved = 0, declined = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var status = String(r[c.Status] || '').toLowerCase();
    var email = String(r[c.Email] || '').trim();
    var name = r[c.Name] || '';
    var rowNum = i + 2;
    if (!email) continue;

    if (status === 'approved' && !r[c.MemberNo]) {
      max += 1;
      var no = 'SCV-' + year + '-' + ('000000' + max).slice(-6);
      var tier = r[c.Tier] || 'Member', aff = r[c.Affiliation] || '';
      var link = CARD_BASE + '?id=' + encodeURIComponent(no) + '&name=' + encodeURIComponent(name)
               + '&tier=' + encodeURIComponent(tier) + '&aff=' + encodeURIComponent(aff);
      MailApp.sendEmail({ to: email, name: FROM_NAME, replyTo: TEAM_EMAIL,
        subject: 'Welcome to Sciovia — your Member Pass', htmlBody: welcomeHtml_(name, no, tier, link) });
      sh.getRange(rowNum, c.MemberNo + 1).setValue(no);
      sh.getRange(rowNum, c.Status + 1).setValue('Sent');
      sh.getRange(rowNum, c.ProcessedAt + 1).setValue(new Date());
      approved++;
    } else if (status === 'rejected' && !r[c.ProcessedAt]) {
      var reason = (c.Note != null && r[c.Note]) ? String(r[c.Note]) : '';
      MailApp.sendEmail({ to: email, name: FROM_NAME, replyTo: TEAM_EMAIL,
        subject: 'Your Sciovia membership application', htmlBody: declineHtml_(name, reason) });
      sh.getRange(rowNum, c.Status + 1).setValue('Declined');
      sh.getRange(rowNum, c.ProcessedAt + 1).setValue(new Date());
      declined++;
    }
  }

  SpreadsheetApp.getUi().alert('Sciovia',
    approved + ' welcome email(s) sent · ' + declined + ' decline email(s) sent.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function declineHtml_(name, reason) {
  var reasonBlock = reason
    ? '<p style="background:#f7f0f2;border-left:3px solid #b0516a;padding:12px 16px;border-radius:6px"><strong>Note from the Committee:</strong> ' + esc_(reason) + '</p>'
    : '';
  return '' +
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1a2a2a">' +
    '<div style="background:#14524b;padding:26px 30px;border-radius:12px 12px 0 0">' +
      '<div style="font-size:24px;font-family:Georgia,serif;color:#faf7f1">Sciovia</div>' +
      '<div style="font-size:12px;color:#e0a648;letter-spacing:3px">THE PATH OF KNOWING</div>' +
    '</div>' +
    '<div style="border:1px solid #e7e1d5;border-top:none;border-radius:0 0 12px 12px;padding:28px 30px">' +
      '<p>Dear ' + esc_(name) + ',</p>' +
      '<p>Thank you for your interest in becoming a member of the Sciovia research community, and for the time you took to apply.</p>' +
      '<p>After careful consideration, the Managing Committee is unable to approve your membership at this time.</p>' +
      reasonBlock +
      '<p>Please be assured this is not a reflection of your abilities or standing as a researcher. Membership is assessed against our current criteria and focus, which continue to evolve as the community grows.</p>' +
      '<p><strong>You are warmly invited to submit a fresh application after 180 days</strong>, and the Committee will be glad to review it again.</p>' +
      '<p>In the meantime, everything Sciovia offers — the weekly digest, the opportunities directory, and the Sciovia Awards — remains completely free and open to you at <a href="https://sciovia.org">sciovia.org</a>.</p>' +
      '<p style="margin-top:22px">With appreciation and warm regards,<br>The Sciovia Managing Committee</p>' +
      '<p style="color:#5f716f;font-size:12px;margin-top:20px">Independent &amp; non-commercial · <a href="mailto:hello@sciovia.org" style="color:#5f716f">hello@sciovia.org</a></p>' +
    '</div>' +
  '</div>';
}

function welcomeHtml_(name, no, tier, link) {
  return '' +
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1a2a2a">' +
    '<div style="background:#14524b;padding:26px 30px;border-radius:12px 12px 0 0">' +
      '<div style="font-size:24px;font-family:Georgia,serif;color:#faf7f1">Sciovia</div>' +
      '<div style="font-size:12px;color:#e0a648;letter-spacing:3px">THE PATH OF KNOWING</div>' +
    '</div>' +
    '<div style="border:1px solid #e7e1d5;border-top:none;border-radius:0 0 12px 12px;padding:28px 30px">' +
      '<p>Dear ' + esc_(name) + ',</p>' +
      '<p>It is our pleasure to welcome you to the Sciovia research community. Following review by the Managing Committee, your application has been <strong>approved</strong>.</p>' +
      '<p style="background:#f4f5f3;border-left:3px solid #14524b;padding:12px 16px;border-radius:6px">' +
        '<strong>Sciovia ID:</strong> ' + no + '<br>' +
        '<strong>Standing:</strong> ' + esc_(tier) +
      '</p>' +
      '<p>Your personal Member Pass is ready:</p>' +
      '<p><a href="' + link + '" style="display:inline-block;background:#c1832f;color:#fff;' +
        'text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">' +
        'View &amp; download your Member Pass</a></p>' +
      '<p style="color:#5f716f;font-size:12px">If the button does not work, paste this link into your browser:<br>' + link + '</p>' +
      '<p style="margin-top:20px"><strong>As a Sciovia member, you enjoy:</strong></p>' +
      '<ul style="margin:6px 0 0;padding-left:20px;color:#333;line-height:1.7">' +
        '<li>Your personal <strong>Member Pass</strong> — a digital credential carrying your unique Sciovia ID.</li>' +
        '<li>The <strong>weekly Sciovia digest</strong> — curated calls for papers, funding, positions, and internships, delivered to your inbox.</li>' +
        '<li>The privilege to <strong>nominate outstanding researchers</strong> for the Sciovia Awards.</li>' +
        '<li>The ability to <strong>nominate colleagues</strong> for fast-track membership.</li>' +
        '<li>Standing within a community devoted to fair, open, and ethical research.</li>' +
      '</ul>' +
      '<p style="margin-top:22px">We are delighted to have you with us, and we look forward to supporting your research journey.</p>' +
      '<p>Warm regards,<br>The Sciovia Managing Committee</p>' +
      '<p style="color:#5f716f;font-size:12px;margin-top:20px">An initiative of the Sciovia Managing Committee · Independent &amp; non-commercial · <a href="mailto:hello@sciovia.org" style="color:#5f716f">hello@sciovia.org</a></p>' +
    '</div>' +
  '</div>';
}

function esc_(s) {
  return String(s).replace(/[&<>"]/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
  });
}
