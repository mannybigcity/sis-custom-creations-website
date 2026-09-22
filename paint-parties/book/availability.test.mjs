import assert from "node:assert/strict";
import test from "node:test";
import { dayState, monthBounds, monthGrid, shiftDate } from "./availability.mjs";

test("one held block stays bright and both held blocks turn the day light", () => {
  const today = "2026-09-22";
  const holds = [
    { date: shiftDate(today, 3), slot: "am" },
    { date: shiftDate(today, 8), slot: "am" },
    { date: shiftDate(today, 8), slot: "pm" },
    { date: shiftDate(today, 12), slot: "pm" },
  ];
  const open = dayState(holds, shiftDate(today, 1), today);
  const partial = dayState(holds, shiftDate(today, 3), today);
  const full = dayState(holds, shiftDate(today, 8), today);
  const past = dayState(holds, shiftDate(today, -1), today);
  assert.equal(open.shade, "bright");
  assert.equal(open.bookable, true);
  assert.equal(partial.shade, "bright");
  assert.equal(partial.am, "held");
  assert.equal(partial.pm, "open");
  assert.equal(full.shade, "light");
  assert.equal(full.bookable, false);
  assert.equal(past.bookable, false);
  assert.equal(JSON.stringify(holds).includes("host"), false);
});

test("month grid starts on Sunday and stays inside a six-week frame", () => {
  assert.deepEqual(monthBounds("2026-09"), { from: "2026-09-01", to: "2026-09-30" });
  const cells = monthGrid("2026-09");
  assert.equal(cells.length, 42);
  assert.equal(cells[0].date, "2026-08-30");
  assert.equal(cells[0].inMonth, false);
  assert.equal(cells.find((cell) => cell.date === "2026-09-01")?.inMonth, true);
});
