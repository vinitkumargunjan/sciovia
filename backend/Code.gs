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
               'Field','Profile','Reason','Status','MemberNo','ProcessedAt'];

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
    sheet_().appendRow([
      new Date(), d.name || '', d.email || '', d.category || '',
      d.affiliation || '', d.country || '', d.field || '', d.profile || '',
      d.reason || '', 'Pending', '', ''
    ]);
    return json_({ ok: true });
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

/** Reads all "Published" opportunities from every section tab; returns JSON for the website. */
function opportunitiesJson_() {
  var ss = getOppSheet_();
  if (!ss) return json_([]);
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
      out.push({
        category: sec.category,
        type: r[idx['Type']] || '',
        title: r[idx['Title']] || '',
        org: r[idx['Organization']] || '',
        location: r[idx['Location']] || '',
        mode: r[idx['Mode']] || '',
        dates: r[idx['Dates']] || '',
        deadline: fmtDate_(r[idx['Deadline']]),
        link: r[idx['Link']] || ''
      });
    }
  });
  return json_(out);
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

/** Adds the Sciovia menu when the sheet opens. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sciovia')
    .addItem('Send passes to approved members', 'processApprovals')
    .addItem('Set up Opportunities sheet', 'setupOpportunitiesSheet')
    .addToUi();
}

/** Emails every row whose Status is "Approved" and has no MemberNo yet. */
function processApprovals() {
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var c = {};
  HEADERS.forEach(function (h) { c[h] = headers.indexOf(h); });

  var rows = values.slice(1);

  // find the highest existing Sciovia ID for this year, to continue the sequence
  var year = new Date().getFullYear();
  var max = 0;
  rows.forEach(function (r) {
    var m = String(r[c.MemberNo] || '').match(/SCV-\d{4}-(\d{6})/);
    if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
  });

  var sent = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var status = String(r[c.Status] || '').toLowerCase();
    if (status !== 'approved' || r[c.MemberNo]) continue;
    var email = String(r[c.Email] || '').trim();
    if (!email) continue;

    max += 1;
    var no = 'SCV-' + year + '-' + ('000000' + max).slice(-6);
    var name = r[c.Name], tier = r[c.Tier] || 'Member', aff = r[c.Affiliation] || '';
    var link = CARD_BASE
      + '?id='   + encodeURIComponent(no)
      + '&name=' + encodeURIComponent(name)
      + '&tier=' + encodeURIComponent(tier)
      + '&aff='  + encodeURIComponent(aff);

    MailApp.sendEmail({
      to: email,
      name: FROM_NAME,
      replyTo: TEAM_EMAIL,
      subject: 'Welcome to Sciovia — your Member Pass',
      htmlBody: welcomeHtml_(name, no, tier, link)
    });

    var row = i + 2; // +1 header, +1 for 1-based rows
    sh.getRange(row, c.MemberNo + 1).setValue(no);
    sh.getRange(row, c.Status + 1).setValue('Sent');
    sh.getRange(row, c.ProcessedAt + 1).setValue(new Date());
    sent++;
  }

  SpreadsheetApp.getUi().alert('Sciovia', sent + ' welcome email(s) sent.',
    SpreadsheetApp.getUi().ButtonSet.OK);
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
      '<p>Welcome to the Sciovia community — your application has been approved.</p>' +
      '<p style="background:#f4f5f3;border-left:3px solid #14524b;padding:12px 16px;border-radius:6px">' +
        '<strong>Sciovia ID:</strong> ' + no + '<br>' +
        '<strong>Standing:</strong> ' + esc_(tier) +
      '</p>' +
      '<p>Your personal Member Pass is ready:</p>' +
      '<p><a href="' + link + '" style="display:inline-block;background:#c1832f;color:#fff;' +
        'text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">' +
        'View &amp; download your Member Pass</a></p>' +
      '<p style="color:#5f716f;font-size:12px">If the button does not work, paste this link into your browser:<br>' + link + '</p>' +
      '<p style="margin-top:22px">We are glad to have you with us.</p>' +
      '<p style="color:#5f716f;font-size:12px;margin-top:20px">An initiative of the Sciovia Managing Committee · Independent &amp; non-commercial · teamsciovia@gmail.com</p>' +
    '</div>' +
  '</div>';
}

function esc_(s) {
  return String(s).replace(/[&<>"]/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
  });
}
