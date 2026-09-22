const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export const PARTY_STARTS = {
  am: ["09:00", "09:30", "10:00", "10:30"],
  pm: ["14:00", "14:30", "15:00", "15:30"],
};

export const PARTY_TYPES = [
  "Adult Paint Parties",
  "Kids Paint Parties",
  "Schools / Daycares",
  "Splatter Paint Experiences",
];

export const BLOCKS = {
  am: { label: "AM 9:00–1:00", detail: "Morning block. Party about 2–2.5 hours." },
  pm: { label: "PM 2:00–6:00", detail: "Afternoon block. An hour after morning parties is for teardown." },
};

export function chicagoToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftDate(dateOnly, days) {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return dateOnly;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return shifted.toISOString().slice(0, 10);
}

export function shiftMonth(monthKey, delta) {
  const match = MONTH_KEY.exec(monthKey);
  if (!match) return monthKey;
  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthBounds(monthKey) {
  if (!MONTH_KEY.test(monthKey)) return null;
  const month = Number(monthKey.slice(5, 7));
  if (month < 1 || month > 12) return null;
  const from = `${monthKey}-01`;
  const to = shiftDate(`${shiftMonth(monthKey, 1)}-01`, -1);
  return { from, to };
}

function weekdayIndex(dateOnly) {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return 0;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
}

export function monthGrid(monthKey) {
  const bounds = monthBounds(monthKey);
  if (!bounds) return [];
  const lead = weekdayIndex(bounds.from);
  return Array.from({ length: 42 }, (_, index) => {
    const date = shiftDate(bounds.from, index - lead);
    return { date, inMonth: date.slice(0, 7) === monthKey };
  });
}

export function demoHolds(today) {
  return [
    { date: shiftDate(today, 3), slot: "am" },
    { date: shiftDate(today, 8), slot: "am" },
    { date: shiftDate(today, 8), slot: "pm" },
    { date: shiftDate(today, 12), slot: "pm" },
  ];
}

export function dayState(holds, date, today) {
  const am = holds.some((hold) => hold.date === date && hold.slot === "am") ? "held" : "open";
  const pm = holds.some((hold) => hold.date === date && hold.slot === "pm") ? "held" : "open";
  const past = date < today;
  return {
    date,
    shade: am === "held" && pm === "held" ? "light" : "bright",
    am,
    pm,
    bookable: !past && (am === "open" || pm === "open"),
  };
}

export function holdsFromDays(days) {
  const holds = [];
  for (const day of days) {
    if (day.am === "held") holds.push({ date: day.date, slot: "am" });
    if (day.pm === "held") holds.push({ date: day.date, slot: "pm" });
  }
  return holds;
}

export function formatMonth(monthKey) {
  const match = MONTH_KEY.exec(monthKey);
  if (!match) return monthKey;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1, 12)));
}

export function formatDay(dateOnly, options = { weekday: "long", month: "long", day: "numeric" }) {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return dateOnly;
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)),
  );
}

export function formatStart(startTime) {
  const [hourText, minute] = startTime.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

export function slotLabel(slot) {
  return slot === "am" ? BLOCKS.am.label : BLOCKS.pm.label;
}
