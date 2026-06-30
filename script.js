/**
 * script.js — The Hot Seat
 * Fetches live debate state from the bot's API endpoint and renders it.
 * Polls every 15 seconds.
 *
 * Expected API endpoint: GET https://your-render-bot-url.onrender.com/state
 * Configure BOT_API_URL below to match your Render service URL.
 */

const BOT_API_URL = "https://thewhip-e9qu.onrender.com"; // ← change this

const SIGNUP_URL  =
  "https://discord.com/channels/1519281420458000385/1519302584769183805";

// ── DOM refs ─────────────────────────────────────────────────────────────────
const memberCountEl  = document.getElementById("member-count");
const debateContent  = document.getElementById("debate-content");
const liveBadge      = document.getElementById("live-badge");
const footerYear     = document.getElementById("footer-year");
const modalOverlay   = document.getElementById("modal-overlay");
const infoBtn        = document.getElementById("info-btn");
const modalClose     = document.getElementById("modal-close");

// ── Leaderboard modal ─────────────────────────────────────────────────────────
const leaderboardTab     = document.getElementById("leaderboard-tab");
const leaderboardOverlay = document.getElementById("leaderboard-overlay");
const leaderboardClose   = document.getElementById("leaderboard-close");
const leaderboardContent = document.getElementById("leaderboard-content");
const lbPagination       = document.getElementById("leaderboard-pagination");
const lbPageLabel        = document.getElementById("lb-page-label");
const lbPrevBtn          = document.getElementById("lb-prev-btn");
const lbNextBtn          = document.getElementById("lb-next-btn");

let lbCurrentPage = 1;

function openLeaderboard() {
  leaderboardOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  lbCurrentPage = 1;
  loadLeaderboardPage(lbCurrentPage);
}

function closeLeaderboard() {
  leaderboardOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

leaderboardTab.addEventListener("click", openLeaderboard);
leaderboardClose.addEventListener("click", closeLeaderboard);
leaderboardOverlay.addEventListener("click", (e) => {
  if (e.target === leaderboardOverlay) closeLeaderboard();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && leaderboardOverlay.classList.contains("open")) closeLeaderboard();
});

lbPrevBtn.addEventListener("click", () => {
  if (lbCurrentPage > 1) {
    lbCurrentPage -= 1;
    loadLeaderboardPage(lbCurrentPage);
  }
});
lbNextBtn.addEventListener("click", () => {
  lbCurrentPage += 1;
  loadLeaderboardPage(lbCurrentPage);
});

async function fetchLeaderboard(page) {
  if (!BOT_API_URL || BOT_API_URL.includes("YOUR_RENDER")) return null;
  try {
    const url = `${BOT_API_URL.replace(/\/$/, "")}/leaderboard?page=${page}&t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("fetchLeaderboard error:", err);
    return null;
  }
}

function renderLeaderboardRows(entries, rankStart) {
  if (!entries || entries.length === 0) {
    return `<div class="lb-empty">No points have been awarded yet.</div>`;
  }
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return entries.map((e, i) => {
    const rank = rankStart + i;
    const medal = medals[rank] || `#${rank}`;
    return `
      <div class="lb-row">
        <span class="lb-rank">${medal}</span>
        <span class="lb-name">${escHtml(e.username)}</span>
        <span class="lb-points">${e.points} pt${e.points === 1 ? "" : "s"}</span>
      </div>`;
  }).join("");
}

async function loadLeaderboardPage(page) {
  leaderboardContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading standings…</p>
    </div>`;
  lbPagination.style.display = "none";

  const data = await fetchLeaderboard(page);

  if (!data) {
    leaderboardContent.innerHTML = `<div class="lb-empty">Couldn't load the leaderboard. Try again shortly.</div>`;
    return;
  }

  const rankStart = (data.page - 1) * 10 + 1;
  leaderboardContent.innerHTML = renderLeaderboardRows(data.entries, rankStart);

  if (data.total_pages > 1 || data.entries.length > 0) {
    lbPagination.style.display = "flex";
    lbPageLabel.textContent = `Page ${data.page} of ${data.total_pages}`;
    lbPrevBtn.disabled = data.page <= 1;
    lbNextBtn.disabled = data.page >= data.total_pages;
  }

  lbCurrentPage = data.page;
}

// ── Footer year ───────────────────────────────────────────────────────────────
footerYear.textContent = new Date().getFullYear();

// ── Modal ─────────────────────────────────────────────────────────────────────
infoBtn.addEventListener("click", () => {
  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
});

function closeModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

// ── Renderers ─────────────────────────────────────────────────────────────────

function renderNoDebate() {
  liveBadge.style.display = "none";
  return `
    <div class="no-debate">
      <div class="no-debate-icon">🎙️</div>
      <h3>No Current Debate</h3>
      <p>There's no active session right now. Join the server to be notified when the next one starts.</p>
    </div>`;
}

function renderSignups(signups, date) {
  liveBadge.style.display = "none";

  const dateStr = date ? `<span style="font-size:0.78rem;color:var(--text-muted);font-weight:500">${escHtml(date)}</span>` : "";

  let candidatesHtml;
  if (!signups || signups.length === 0) {
    candidatesHtml = `<div class="no-candidates">No candidates yet — be the first to sign up!</div>`;
  } else {
    candidatesHtml = `<div class="candidate-list">` +
      signups.map((s, i) => `
        <div class="candidate-card">
          <span class="candidate-num">${i + 1}</span>
          <div class="candidate-info">
            <div class="candidate-name">${escHtml(s.username)}</div>
            <div class="candidate-claim">"${escHtml(s.claim)}"</div>
          </div>
        </div>`).join("") +
      `</div>`;
  }

  return `
    <div class="signup-header">
      <div>
        <h3>Sign-Ups Open ${dateStr}</h3>
      </div>
      <a class="signup-btn" href="${SIGNUP_URL}" target="_blank" rel="noopener">
        ✏️&nbsp; Sign Up!
      </a>
    </div>
    ${candidatesHtml}`;
}

function renderActiveDebate(state) {
  liveBadge.style.display = "inline-block";

  const defenderHtml = state.defender
    ? escHtml(state.defender)
    : '<span style="color:var(--text-muted)">TBC</span>';

  const opposerHtml = state.opposer
    ? escHtml(state.opposer)
    : '<span style="color:var(--text-muted)">Awaiting first message…</span>';

  const timerHtml = state.remaining != null
    ? `<div class="timer-row">⏱ Time remaining: <span class="timer-value">${formatTime(state.remaining)}</span></div>`
    : "";

  return `
    <div class="active-debate">
      <div class="debate-claim-card">
        <div class="debate-claim-label">Claim being defended</div>
        <div class="debate-claim-text">"${escHtml(state.claim || "")}"</div>
      </div>

      <div class="debate-roles">
        <div class="role-card defender">
          <div class="role-label">Defender</div>
          <div class="role-name">${defenderHtml}</div>
        </div>
        <div class="role-card opposer">
          <div class="role-label">Opposer</div>
          <div class="role-name">${opposerHtml}</div>
        </div>
      </div>

      ${timerHtml}
    </div>`;
}

function renderNextDebate(defender, claim) {
  liveBadge.style.display = "none";
  return `
    <div class="active-debate">
      <div class="debate-claim-card">
        <div class="debate-claim-label">Next Debate — Claim Selected</div>
        <div class="debate-claim-text">"${escHtml(claim)}"</div>
      </div>
      <div class="debate-roles" style="grid-template-columns:1fr">
        <div class="role-card defender">
          <div class="role-label">Defender</div>
          <div class="role-name">${escHtml(defender)}</div>
        </div>
      </div>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">
        Debate hasn't started yet — stay tuned.
      </p>
    </div>`;
}

function renderError() {
  liveBadge.style.display = "none";
  // Check if URL is still the placeholder
  if (BOT_API_URL.includes("YOUR_RENDER_BOT_URL")) {
    return `
      <div class="no-debate">
        <div class="no-debate-icon">🔧</div>
        <h3>Bot URL not configured</h3>
        <p>Open <code>script.js</code> and replace <code>YOUR_RENDER_BOT_URL</code> with your Render service URL.</p>
      </div>`;
  }
  return `
    <div class="no-debate">
      <div class="no-debate-icon">🎙️</div>
      <h3>No Current Debate</h3>
      <p>The bot is starting up or there's no active session. Check back soon.</p>
    </div>`;
}

// ── Fetch & render ────────────────────────────────────────────────────────────

async function fetchState() {
  // Skip if URL is still placeholder
  if (!BOT_API_URL || BOT_API_URL.includes("YOUR_RENDER")) return null;
  try {
    const url = `${BOT_API_URL.replace(/\/$/, "")}/state?t=${Date.now()}`;
    const res = await fetch(url, {
      method: "GET",
      cache:  "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("fetchState error:", err);
    return null;
  }
}

// ── Past debates renderer ─────────────────────────────────────────────────────

function renderPastDebates(debates) {
  const el = document.getElementById("past-debates");
  if (!el) return;

  if (!debates || debates.length === 0) {
    el.innerHTML = `<p class="muted-text">No recent debates logged yet.</p>`;
    return;
  }

  const tiles = debates.map(d => {
    const opposers = (d.opposers && d.opposers.length)
      ? d.opposers.map(o => escHtml(o)).join(", ")
      : "None";
    return `
      <div class="past-tile">
        <div class="past-tile-date">${escHtml(d.date || "")}</div>
        <div class="past-tile-claim">"${escHtml(d.claim || "—")}"</div>
        <div class="past-tile-row">
          <span class="past-tile-label">Defender</span>
          <span class="past-tile-value">${escHtml(d.defender || "—")}</span>
        </div>
        <div class="past-tile-row">
          <span class="past-tile-label">Opposer(s)</span>
          <span class="past-tile-value">${opposers}</span>
        </div>
      </div>`;
  }).join("");

  el.innerHTML = `<div class="past-tiles">${tiles}</div>`;
}

// ── Main update ────────────────────────────────────────────────────────────────

async function update() {
  const data = await fetchState();

  if (!data) {
    debateContent.innerHTML = renderError();
    memberCountEl.textContent = "— Members";
    return;
  }

  // Member count
  if (data.member_count != null) {
    memberCountEl.textContent = `${data.member_count.toLocaleString()} Members`;
  }

  // Debate state
  if (data.active) {
    debateContent.innerHTML = renderActiveDebate(data);
  } else if (data.chosen_claim && data.chosen_defender) {
    debateContent.innerHTML = renderNextDebate(data.chosen_defender, data.chosen_claim);
  } else if (data.signup_open) {
    debateContent.innerHTML = renderSignups(data.signups, data.debate_date);
  } else {
    debateContent.innerHTML = renderNoDebate();
  }

  // Past debates
  renderPastDebates(data.past_debates || []);
}

// Initial load + poll every 15s
update();
setInterval(update, 15_000);
