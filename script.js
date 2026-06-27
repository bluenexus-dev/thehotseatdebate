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

function renderError() {
  liveBadge.style.display = "none";
  return `
    <div class="no-debate">
      <div class="no-debate-icon">⚠️</div>
      <h3>Couldn't reach the server</h3>
      <p>The bot may be offline or starting up. Retrying shortly.</p>
    </div>`;
}

// ── Fetch & render ────────────────────────────────────────────────────────────

async function fetchState() {
  try {
    const res = await fetch(`${BOT_API_URL}/state`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("fetchState error:", err);
    return null;
  }
}

async function update() {
  const data = await fetchState();

  if (!data) {
    debateContent.innerHTML = renderError();
    memberCountEl.textContent = "Members unavailable";
    return;
  }

  // Member count
  if (data.member_count != null) {
    memberCountEl.textContent = `${data.member_count.toLocaleString()} Members`;
  }

  // Debate state
  if (data.active) {
    debateContent.innerHTML = renderActiveDebate(data);
  } else if (data.signup_open) {
    debateContent.innerHTML = renderSignups(data.signups, data.debate_date);
  } else {
    debateContent.innerHTML = renderNoDebate();
  }
}

// Initial load + poll every 15s
update();
setInterval(update, 15_000);
