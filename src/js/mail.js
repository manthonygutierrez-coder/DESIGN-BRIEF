"use strict";
/* ── mail ─────────────────────────────────────────────────
 * Briefs arrive here. The inbox is the scoped read on your work:
 * every message carries one brief through a state machine, and the
 * taskbar keeps nagging until you have looked at all of them.
 *
 *   unread → read → { archived | completed | deleted | rerolled }
 *
 * Only ids and states are persisted; the message body is regenerated
 * from CATS + CLIENTS on render, so content can change under saved state.
 */

const Mail = (() => {
  const FOLDERS = [
    { id: "inbox",     label: "Inbox",     has: (m) => m.state === "unread" || m.state === "read" },
    { id: "archive",   label: "Archive",   has: (m) => m.state === "archived" || m.state === "rerolled" },
    { id: "completed", label: "Completed", has: (m) => m.state === "completed" },
    { id: "deleted",   label: "Deleted",   has: (m) => m.state === "deleted" },
  ];

  let state = null;            // the whole Bridge state object
  let folder = "inbox";
  let selectedId = null;
  let trayEl = null, balloonEl = null;

  /* ── persistence ─────────────────────────────────────── */
  async function boot(){
    state = await Bridge.getState();
    if (!Array.isArray(state.mail)) state.mail = [];
    if (!Array.isArray(state.issued)) state.issued = [];
    if (!state.projects || typeof state.projects !== "object") state.projects = {};
    mountTray();
    syncTray();
  }
  function save(){ Bridge.saveState(state); }

  /* ── message content, derived not stored ─────────────── */
  function briefOf(m){ return CATS[m.ci].briefs[m.briefIdx]; }
  function clientOf(m){ return clientFor(briefOf(m).project); }

  function subjectOf(m){
    const b = briefOf(m);
    // Shown in Silkscreen in the list, where "&" draws as a cent sign.
    return b.project + " — " + pixelLabel(CATS[m.ci].label).toLowerCase() + " brief";
  }

  function bodyHTML(m){
    const b = briefOf(m), c = clientOf(m), cat = CATS[m.ci];
    const site = c ? c.dom : null;
    return (
      '<p class="ml-hi">' + esc(c && c.greet ? c.greet : "Hello —") + '</p>' +
      '<p>' + esc(b.ask) + '</p>' +
      '<p class="ml-lbl">What we need</p>' +
      '<ul class="ml-ul">' + b.deliver.map((d) => "<li>" + esc(d) + "</li>").join("") + '</ul>' +
      '<p class="ml-lbl">Non-negotiable</p>' +
      '<ul class="ml-ul ml-ul--x">' + b.limits.map((d) => "<li>" + esc(d) + "</li>").join("") + '</ul>' +
      '<p class="ml-lbl">Tone we are after</p>' +
      '<p>' + esc(b.tone) + '</p>' +
      (site
        ? '<p class="ml-lbl">Our site, for reference</p>' +
          '<p><a class="ml-link" data-url="http://' + esc(site) + '/">http://' + esc(site) + '/</a><br>' +
          '<span class="ml-note">Have a look at how we talk to customers now. There are images on there you are welcome to work from.</span></p>'
        : "") +
      (c ? '<p class="ml-sig">' + esc(c.voice) + '<br><br>' +
           esc(c.who) + '<br><span class="ml-note">' + esc(c.role) + ', ' + esc(c.co) + '</span></p>' : "") +
      '<div class="ml-brief-cta">' +
        '<button class="w98btn" data-act="open-brief">Open the full brief</button>' +
        (m.projectDir
          ? '<button class="w98btn" data-act="reveal">Show project folder</button>'
          : '<button class="w98btn" data-act="accept">Accept &amp; make project folder</button>') +
      '</div>'
    );
  }

  /* The reply after you deliver. Every client writes their own — a diner owner
   * and a municipal comms director do not say thank you the same way. */
  function signOffHTML(m){
    const c = clientOf(m);
    const body = c && c.wrap
      ? c.wrap
      : "Everything opened fine on our end. Invoice whenever suits you.";
    return '<p class="ml-hi">Received, thank you.</p>' +
      '<p>' + esc(body) + '</p>' +
      (c ? '<p class="ml-sig">' + esc(c.who) + '<br><span class="ml-note">' + esc(c.role) + ', ' + esc(c.co) + '</span></p>' : "");
  }

  /* ── issuing ─────────────────────────────────────────── */
  function pickBrief(ci){
    const n = CATS[ci].briefs.length;
    const free = [];
    for (let i = 0; i < n; i++) if (!state.issued.includes(ci + ":" + i)) free.push(i);
    if (free.length) return free[Math.floor(Math.random() * free.length)];
    // Exhausted: reuse the one issued longest ago for this discipline.
    const mine = state.mail.filter((m) => m.ci === ci).sort((a, b) => a.received - b.received);
    return mine.length ? mine[0].briefIdx : Math.floor(Math.random() * n);
  }

  function issue(ci, opts = {}){
    const briefIdx = pickBrief(ci);
    const key = ci + ":" + briefIdx;
    if (!state.issued.includes(key)) state.issued.push(key);
    const m = {
      id: "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      ci, briefIdx,
      state: "unread",
      received: Date.now(),
      replied: false,
      signedOff: false,
      projectDir: null,
      attachments: [],
    };
    state.mail.unshift(m);
    save();
    render();
    syncTray();
    if (!opts.quiet) balloon(m);
    return m;
  }

  /* ── state transitions ───────────────────────────────── */
  function setState(m, next){
    m.state = next;
    if (next === "read" && !m.readAt) m.readAt = Date.now();
    save(); render(); syncTray();
  }

  function markRead(m){
    if (m.state === "unread") setState(m, "read");
  }

  function reroll(m){
    setState(m, "rerolled");
    const fresh = issue(m.ci, { quiet: true });
    folder = "inbox";
    selectedId = fresh.id;
    render();
    balloon(fresh);
  }

  /* ── tray + balloon notification ─────────────────────── */
  function unreadCount(){
    return state ? state.mail.filter((m) => m.state === "unread").length : 0;
  }

  function mountTray(){
    if (trayEl) return;
    const tray = document.querySelector(".tray");
    if (!tray) return;
    trayEl = document.createElement("button");
    trayEl.className = "tray__mail";
    trayEl.type = "button";
    trayEl.title = "Inbox";
    trayEl.innerHTML = '<i>' + iconSVG("mail", 14) + '</i><span class="tray__n"></span>';
    trayEl.addEventListener("click", () => open());   // not (event) as focusId
    tray.insertBefore(trayEl, tray.firstChild);
  }

  function syncTray(){
    if (!trayEl) return;
    const n = unreadCount();
    trayEl.classList.toggle("has", n > 0);
    trayEl.querySelector(".tray__n").textContent = n > 0 ? String(n) : "";
    trayEl.title = n > 0 ? n + " unread" : "Inbox";
  }

  let balloonTimer = 0;
  function balloon(m){
    if (!balloonEl){
      balloonEl = document.createElement("div");
      balloonEl.className = "balloon";
      document.getElementById("sideScreen").appendChild(balloonEl);
      balloonEl.addEventListener("click", (e) => {
        if (e.target.closest("[data-x]")) { hideBalloon(); return; }
        hideBalloon(); open(m.id);
      });
    }
    const c = clientOf(m);
    balloonEl.innerHTML =
      '<button class="balloon__x" data-x aria-label="Dismiss">&#215;</button>' +
      '<div class="balloon__h">' + iconSVG("mail", 14) + '<span>New message</span></div>' +
      '<div class="balloon__b"><b>' + esc(c ? c.co : "A client") + '</b> sent you a brief.<br>' +
      '<span class="ml-note">' + esc(subjectOf(m)) + '</span></div>';
    balloonEl.classList.add("on");
    clearTimeout(balloonTimer);
    balloonTimer = setTimeout(hideBalloon, 9000);
  }
  function hideBalloon(){ if (balloonEl) balloonEl.classList.remove("on"); }

  /* ── window ──────────────────────────────────────────── */
  function open(focusId){
    if (focusId) { selectedId = focusId; folder = folderOf(focusId) || "inbox"; }
    const existing = getWin("mail");
    if (existing){ revealWin(existing); render(); return existing; }

    const w = createWindow({
      key: "mail", title: "INBOX", iconId: "mail",
      w: 720, h: 500, minW: 460, minH: 300, className: "w98--mail",
    });
    w.client.classList.add("client--flush");
    w.client.innerHTML =
      '<div class="ml">' +
        '<div class="ml__tools">' +
          '<button class="w98btn" data-m="reply">Reply</button>' +
          '<button class="w98btn" data-m="archive">Archive</button>' +
          '<button class="w98btn" data-m="reroll">Re-roll</button>' +
          '<button class="w98btn" data-m="complete">Complete</button>' +
          '<span class="ml__spacer"></span>' +
          '<button class="w98btn" data-m="delete">Delete</button>' +
        '</div>' +
        '<div class="ml__body">' +
          '<div class="ml__folders" role="tablist"></div>' +
          '<div class="ml__right">' +
            '<div class="ml__list" role="listbox"></div>' +
            '<div class="ml__read"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    w.client.addEventListener("click", onWindowClick);
    render();
    return w;
  }

  function restore(){ syncTray(); }

  function folderOf(id){
    const m = byId(id);
    if (!m) return null;
    const f = FOLDERS.find((f) => f.has(m));
    return f ? f.id : null;
  }
  function byId(id){ return state.mail.find((m) => m.id === id) || null; }
  function current(){
    const m = byId(selectedId);
    return m && FOLDERS.find((f) => f.id === folder).has(m) ? m : null;
  }

  /* ── render ──────────────────────────────────────────── */
  function render(){
    const w = getWin("mail");
    if (!w) return;
    const root = w.client.querySelector(".ml");
    const list = FOLDERS.find((f) => f.id === folder);
    const msgs = state.mail.filter(list.has);

    // folders
    root.querySelector(".ml__folders").innerHTML = FOLDERS.map((f) => {
      const all = state.mail.filter(f.has);
      const un = all.filter((m) => m.state === "unread").length;
      return '<button class="mlf' + (f.id === folder ? " on" : "") + '" data-f="' + f.id + '">' +
        '<i>' + iconSVG(f.id === "deleted" ? "trash" : "folder", 14) + '</i>' +
        '<span>' + f.label + '</span>' +
        (un ? '<b class="mlf__n">' + un + '</b>' : (all.length ? '<em class="mlf__c">' + all.length + '</em>' : "")) +
        '</button>';
    }).join("");

    // list
    if (!msgs.length){
      root.querySelector(".ml__list").innerHTML =
        '<p class="ml__empty">' + (folder === "inbox"
          ? "No messages. Pick a discipline from the Start menu to take on work."
          : "Nothing here.") + '</p>';
    } else {
      root.querySelector(".ml__list").innerHTML = msgs.map((m) => {
        const c = clientOf(m);
        return '<button class="mli' + (m.state === "unread" ? " un" : "") +
          (m.id === selectedId ? " on" : "") + (m.state === "rerolled" ? " dim" : "") +
          '" data-id="' + m.id + '" role="option">' +
          '<i>' + iconSVG(CATS[m.ci].id, 14) + '</i>' +
          '<span class="mli__from">' + esc(c ? c.co : "Client") + '</span>' +
          '<span class="mli__sub">' + esc(subjectOf(m)) +
            (m.state === "rerolled" ? ' <em>(re-rolled)</em>' : "") +
            (m.state === "completed" ? ' <em>(delivered)</em>' : "") + '</span>' +
          '<span class="mli__d">' + when(m.received) + '</span>' +
          '</button>';
      }).join("");
    }

    // reading pane
    const m = current();
    const read = root.querySelector(".ml__read");
    if (!m){
      read.innerHTML = '<p class="ml__empty">Select a message.</p>';
    } else {
      const c = clientOf(m);
      read.innerHTML =
        '<div class="ml__hdr">' +
          '<div class="ml__subj">' + esc(subjectOf(m)) + '</div>' +
          '<div class="ml__meta"><b>' + esc(c ? c.who : "Client") + '</b> &lt;' +
            esc(c ? clientEmail(c) : "client@example.com") + '&gt;' +
            '<span class="ml__when">' + when(m.received, true) + '</span></div>' +
        '</div>' +
        '<div class="ml__msg">' + bodyHTML(m) + '</div>' +
        (m.attachments.length
          ? '<div class="ml__att"><span class="ml-lbl">You attached</span>' +
            m.attachments.map((a) => '<span class="att">' + esc(a.name) + '</span>').join("") + '</div>'
          : "") +
        (m.signedOff ? '<div class="ml__reply">' + signOffHTML(m) + '</div>' : "");
      markRead(m);
    }

    // toolbar enablement
    const on = (sel, enabled) => {
      const b = root.querySelector('[data-m="' + sel + '"]');
      if (b) b.disabled = !enabled;
    };
    on("reply", !!m && m.state !== "deleted");
    on("archive", !!m && (m.state === "read" || m.state === "unread"));
    on("reroll", !!m && (m.state === "read" || m.state === "unread"));
    on("complete", !!m && m.replied && m.state !== "completed");   // gated on an actual reply
    const del = root.querySelector('[data-m="delete"]');
    if (del){
      del.disabled = !m;
      del.textContent = m && m.state === "deleted" ? "Restore" : "Delete";
    }
    w.setTitle(unreadCount() ? "INBOX (" + unreadCount() + ")" : "INBOX");
  }

  function when(ts, long){
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    if (!long && Date.now() - ts < 864e5) return hh;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) + " " + hh;
  }

  /* ── interaction ─────────────────────────────────────── */
  function onWindowClick(e){
    const f = e.target.closest("[data-f]");
    if (f){ folder = f.dataset.f; selectedId = null; render(); return; }

    const item = e.target.closest("[data-id]");
    if (item){ selectedId = item.dataset.id; render(); return; }

    const link = e.target.closest(".ml-link");
    if (link){ e.preventDefault(); Web.visit(link.dataset.url, currentClient()); return; }

    const act = e.target.closest("[data-act]");
    if (act){ onAct(act.dataset.act); return; }

    const tool = e.target.closest("[data-m]");
    if (tool && !tool.disabled){ onTool(tool.dataset.m); return; }
  }

  function currentClient(){
    const m = current();
    return m ? clientOf(m) : null;
  }

  async function onAct(act){
    const m = current();
    if (!m) return;
    if (act === "open-brief"){ openBriefAt(m.ci, m.briefIdx); return; }
    if (act === "reveal" && m.projectDir){ Bridge.revealProject(m.projectDir); return; }
    if (act === "accept"){
      const b = briefOf(m);
      const dir = await Bridge.createProject(CATS[m.ci].label, b.project);
      if (dir){
        m.projectDir = dir;
        state.projects[m.id] = { dir, project: b.project, ci: m.ci, briefIdx: m.briefIdx, created: Date.now() };
        save();
      }
      openBriefAt(m.ci, m.briefIdx);
      render();
    }
  }

  function onTool(tool){
    const m = current();
    if (!m) return;
    if (tool === "archive")  return setState(m, "archived");
    if (tool === "reroll")   return reroll(m);
    if (tool === "complete") return setState(m, "completed");
    if (tool === "delete")   return setState(m, m.state === "deleted" ? "read" : "deleted");
    if (tool === "reply")    return composer(m);
  }

  /* ── reply composer ──────────────────────────────────── */
  function composer(m){
    const key = "reply:" + m.id;
    const existing = getWin(key);
    if (existing) return revealWin(existing);
    const c = clientOf(m);
    const w = createWindow({
      key, title: "RE: " + briefOf(m).project, iconId: "mail",
      w: 540, h: 420, minW: 380, minH: 280, className: "w98--mail",
    });
    w.client.classList.add("client--flush");
    w.client.innerHTML =
      '<div class="cmp">' +
        '<div class="cmp__row"><label>To</label><span class="cmp__to">' +
          esc(c ? clientEmail(c) : "client@example.com") + '</span></div>' +
        '<div class="cmp__row"><label>Subject</label><span class="cmp__to">Re: ' +
          esc(subjectOf(m)) + '</span></div>' +
        '<textarea class="cmp__body" spellcheck="false">' +
          'Hello ' + esc(c ? c.who.split(" ")[0] : "") + ',\n\n' +
          'Attached are the final files for ' + esc(briefOf(m).project) + '.\n\n' +
          'Best,\n' +
        '</textarea>' +
        '<div class="cmp__att"></div>' +
        '<div class="cmp__foot">' +
          '<button class="w98btn" data-c="attach">Attach files…</button>' +
          '<span class="ml__spacer"></span>' +
          '<button class="w98btn" data-c="send">Send</button>' +
        '</div>' +
      '</div>';

    let attached = [];
    const attWrap = w.client.querySelector(".cmp__att");
    const sendBtn = w.client.querySelector('[data-c="send"]');
    const paint = () => {
      attWrap.innerHTML = attached.length
        ? '<span class="ml-lbl">Attached</span>' + attached.map((a) => '<span class="att">' + esc(a.name) + '</span>').join("")
        : '<span class="ml-note">Nothing attached yet — the client is expecting files.</span>';
      sendBtn.disabled = attached.length === 0;   // no empty deliveries
    };
    paint();

    w.client.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-c]");
      if (!b || b.disabled) return;
      if (b.dataset.c === "attach"){
        const picked = await Bridge.pickFiles();
        if (picked && picked.length){
          const seen = new Set(attached.map((a) => a.path));
          attached = attached.concat(picked.filter((p) => !seen.has(p.path)));
          paint();
        } else if (!Bridge.native){
          // Browser fallback so the flow is still walkable without Electron.
          attached = attached.concat([{ name: "final-artwork.png", path: "(demo)" }]);
          paint();
        }
        return;
      }
      if (b.dataset.c === "send"){
        m.replied = true;
        m.attachments = attached;
        if (m.state === "unread") m.state = "read";
        save();
        closeWin(w);
        render();
        // The client writes back a little later, the way they actually would.
        setTimeout(() => {
          m.signedOff = true;
          save();
          render();
          syncTray();
          balloon(m);
        }, 7000);
      }
    });
    return w;
  }

  return { boot, open, restore, issue, unreadCount, render };
})();

/* Called by the Start menu: taking on work in a discipline.
 * Deliberately does NOT open the inbox — the notification has to be allowed
 * to sit there unread, which is the whole point of it. */
function requestBrief(ci){
  return Mail.issue(ci);
}
