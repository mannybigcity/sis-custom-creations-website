import {
  BLOCKS,
  PARTY_STARTS,
  PARTY_TYPES,
  chicagoToday,
  dayState,
  formatDay,
  formatMonth,
  formatStart,
  holdsFromDays,
  monthGrid,
  shiftMonth,
  slotLabel,
} from "./availability.mjs";

const config = window.SIS_PARTY_CALENDAR_CONFIG || {};
const apiBase = String(config.apiBase || "https://atlasforentrepreneurs.com").replace(/\/$/, "");
const availabilityPath = config.availabilityPath || "/api/sis/party-availability";

const today = chicagoToday();
const LOAD_ERROR = "Couldn’t load availability — try again";
const state = {
  mode: "loading",
  month: today.slice(0, 7),
  selected: today,
  slot: null,
  startTime: null,
  holds: [],
  loadedMonths: new Set(),
  message: "",
  messageTone: "",
  suggestions: [],
  submitting: false,
};

const root = document.querySelector("[data-party-calendar]");
const modeNote = document.querySelector("[data-mode-note]");
const monthLabel = document.querySelector("[data-month-label]");
const grid = document.querySelector("[data-day-grid]");
const dayTitle = document.querySelector("[data-day-title]");
const slotRow = document.querySelector("[data-slot-row]");
const startRow = document.querySelector("[data-start-row]");
const inquiryCard = document.querySelector("[data-inquiry-card]");
const form = document.querySelector("[data-inquiry-form]");
const message = document.querySelector("[data-calendar-message]");
const suggestions = document.querySelector("[data-suggestions]");
const submitButton = form?.querySelector("[type='submit']");

function endpoint(month) {
  const url = new URL(availabilityPath, `${apiBase}/`);
  if (month) url.searchParams.set("month", month);
  return url.toString();
}

function setMessage(text, tone = "") {
  state.message = text;
  state.messageTone = tone;
  if (!message) return;
  message.hidden = !text;
  message.textContent = text;
  message.dataset.tone = tone;
}

function monthReady(date) {
  return state.loadedMonths.has(String(date).slice(0, 7));
}

function renderMode() {
  if (!modeNote) return;
  modeNote.dataset.mode = state.mode;
  modeNote.replaceChildren();
  if (state.mode === "live") {
    modeNote.textContent = "Bright purple still has an open block. Light purple means both AM and PM are held.";
    return;
  }
  if (state.mode === "error") {
    modeNote.append(LOAD_ERROR);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "retry";
    button.textContent = "Try again";
    button.addEventListener("click", () => refreshMonth());
    modeNote.append(" ", button);
    return;
  }
  modeNote.textContent = "Checking SIS availability…";
}

function render() {
  renderMode();
  if (monthLabel) monthLabel.textContent = formatMonth(state.month);
  renderGrid();
  renderDay();
  if (suggestions) {
    suggestions.replaceChildren();
    for (const suggestion of state.suggestions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestion";
      button.textContent = `${formatDay(suggestion.date, { weekday: "short", month: "short", day: "numeric" })} · ${slotLabel(suggestion.slot)}`;
      button.addEventListener("click", () => {
        state.month = suggestion.date.slice(0, 7);
        state.selected = suggestion.date;
        state.slot = suggestion.slot;
        state.startTime = null;
        state.suggestions = [];
        setMessage("");
        render();
        if (state.mode === "live") loadMonth(state.month, { keepSelection: true });
      });
      suggestions.append(button);
    }
  }
}

function renderGrid() {
  if (!grid) return;
  grid.replaceChildren();
  for (const cell of monthGrid(state.month)) {
    const day = dayState(state.holds, cell.date, today);
    const ready = cell.inMonth && monthReady(cell.date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day";
    button.dataset.shade = !cell.inMonth ? "outside" : ready ? day.shade : "waiting";
    if (cell.date === state.selected) button.dataset.selected = "true";
    if (cell.date === today) button.dataset.today = "true";
    button.setAttribute("aria-pressed", cell.date === state.selected ? "true" : "false");
    if (cell.date === today) button.setAttribute("aria-current", "date");
    const shadeLabel = !ready
      ? ""
      : cell.date < today
        ? day.shade === "light" ? "Full" : "Past"
        : day.shade === "light"
          ? "Full"
          : day.am === "held" || day.pm === "held"
            ? "1 open"
            : "Open";
    button.setAttribute("aria-label", `${formatDay(cell.date, { weekday: "long", month: "long", day: "numeric" })} ${shadeLabel}`.trim());
    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(Number(cell.date.slice(8)));
    button.append(number);
    if (cell.inMonth) {
      const label = document.createElement("span");
      label.className = "day-label";
      label.textContent = shadeLabel;
      button.append(label);
    }
    button.addEventListener("click", () => selectDate(cell.date, cell.inMonth));
    grid.append(button);
  }
}

function renderDay() {
  const day = dayState(state.holds, state.selected, today);
  const ready = monthReady(state.selected);
  if (dayTitle) dayTitle.textContent = formatDay(state.selected);
  if (!slotRow) return;
  slotRow.replaceChildren();
  for (const slot of ["am", "pm"]) {
    const card = document.createElement("article");
    card.className = "slot-card";
    const open = ready && day[slot] === "open" && state.selected >= today;
    card.dataset.state = open ? "open" : "held";
    if (state.slot === slot) card.dataset.selected = "true";
    const title = document.createElement("h3");
    title.textContent = BLOCKS[slot].label;
    const copy = document.createElement("p");
    copy.textContent = !ready
      ? state.mode === "loading"
        ? "Checking this day…"
        : LOAD_ERROR
      : open
        ? BLOCKS[slot].detail
        : state.selected < today
          ? "That day has passed."
          : "This block is held.";
    card.append(title, copy);
    if (open) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot-pick";
      button.textContent = state.slot === slot ? "Selected" : "Choose this block";
      button.addEventListener("click", () => {
        state.slot = slot;
        state.startTime = null;
        state.suggestions = [];
        setMessage("");
        render();
      });
      card.append(button);
    }
    slotRow.append(card);
  }
  renderStarts(day);
}

function renderStarts(day) {
  if (!startRow || !form) return;
  const slotOpen = monthReady(state.selected) && state.slot && day[state.slot] === "open" && state.selected >= today;
  startRow.hidden = !slotOpen;
  if (inquiryCard) inquiryCard.hidden = !slotOpen || !state.startTime;
  startRow.replaceChildren();
  if (!slotOpen || !state.slot) return;
  const heading = document.createElement("h3");
  heading.textContent = "Start time inside the block";
  const note = document.createElement("p");
  note.textContent = "The party runs about 2–2.5 hours. These starts finish by the end of the block. The hold still occupies the whole morning or afternoon.";
  const choices = document.createElement("div");
  choices.className = "start-choices";
  for (const startTime of PARTY_STARTS[state.slot]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "start-choice";
    button.textContent = formatStart(startTime);
    button.setAttribute("aria-pressed", state.startTime === startTime ? "true" : "false");
    button.addEventListener("click", () => {
      state.startTime = startTime;
      setMessage("");
      render();
    });
    choices.append(button);
  }
  startRow.append(heading, note, choices);
  const summary = inquiryCard?.querySelector("[data-selection-summary]");
  if (summary && state.startTime && state.slot) {
    summary.textContent = `${formatDay(state.selected)} · ${slotLabel(state.slot)} · starts ${formatStart(state.startTime)} Central. This request holds the full block.`;
  }
}

async function selectDate(date, inMonth) {
  state.selected = date;
  state.slot = null;
  state.startTime = null;
  state.suggestions = [];
  setMessage("");
  if (!inMonth) state.month = date.slice(0, 7);
  if (!monthReady(date)) {
    await refreshMonth();
    return;
  }
  render();
}

async function loadMonth(month, { keepSelection = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(endpoint(month), {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("unavailable");
    const body = await response.json();
    if (!body || body.ok !== true || body.mode !== "live" || !Array.isArray(body.days)) throw new Error("unavailable");
    state.mode = "live";
    state.loadedMonths.add(month);
    state.holds = mergeHolds(state.holds, holdsFromDays(body.days), month);
    if (!keepSelection) {
      state.selected = state.selected.slice(0, 7) === month ? state.selected : `${month}-01`;
    }
    render();
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function mergeHolds(existing, incoming, month) {
  const kept = existing.filter((hold) => hold.date.slice(0, 7) !== month);
  return kept.concat(incoming);
}

async function refreshMonth() {
  state.mode = "loading";
  setMessage("");
  render();
  const live = await loadMonth(state.month, { keepSelection: true });
  if (!live) {
    state.mode = "error";
    render();
  }
}

async function boot() {
  await refreshMonth();
}

document.querySelector("[data-prev-month]")?.addEventListener("click", () => changeMonth(-1));
document.querySelector("[data-next-month]")?.addEventListener("click", () => changeMonth(1));

async function changeMonth(delta) {
  state.month = shiftMonth(state.month, delta);
  state.slot = null;
  state.startTime = null;
  state.selected = `${state.month}-01`;
  await refreshMonth();
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.submitting) return;
  const data = new FormData(form);
  if (String(data.get("companyWebsite") || "").trim()) return;
  const payload = {
    requestId: crypto.randomUUID(),
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    partyType: String(data.get("partyType") || "").trim(),
    guestCount: String(data.get("guestCount") || "").trim(),
    zip: String(data.get("zip") || "").trim(),
    notes: String(data.get("notes") || "").trim(),
    date: state.selected,
    slot: state.slot,
    startTime: state.startTime,
    consent: data.get("consent") === "on",
    sourceUrl: location.href,
  };
  if (!payload.slot || !payload.startTime) {
    setMessage("Choose an open block and a start time first.", "warn");
    return;
  }
  if (state.mode !== "live" || !monthReady(payload.date)) {
    setMessage("Couldn’t save that request. Try again.", "warn");
    return;
  }
  state.submitting = true;
  if (submitButton) submitButton.disabled = true;
  try {
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "idempotency-key": payload.requestId,
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 201 && body.ok) {
      state.holds.push({ date: payload.date, slot: payload.slot });
      state.slot = null;
      state.startTime = null;
      form.reset();
      setMessage(`Tentative request saved for ${formatDay(payload.date)} ${slotLabel(payload.slot)}, starting ${formatStart(payload.startTime)}. SIS will confirm it. The whole block is held.`, "good");
      render();
      return;
    }
    if (response.status === 409) {
      state.suggestions = Array.isArray(body.suggestions) ? body.suggestions : [];
      setMessage("That block was just held. Pick another open block.", "warn");
      await loadMonth(state.month, { keepSelection: true });
      render();
      return;
    }
    if (response.status === 429) {
      setMessage("Too many requests from this network right now. Wait a bit, then try again.", "warn");
      return;
    }
    setMessage("Couldn’t save that request. Check the name, email, and time, then try again.", "warn");
  } catch {
    setMessage("Couldn’t save that request. Try again.", "warn");
  } finally {
    state.submitting = false;
    if (submitButton) submitButton.disabled = false;
  }
});

const partyType = form?.querySelector("[name='partyType']");
if (partyType) {
  for (const type of PARTY_TYPES) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    partyType.append(option);
  }
}

boot();
