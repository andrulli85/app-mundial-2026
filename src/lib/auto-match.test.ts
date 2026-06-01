/**
 * Unit tests for auto-match.ts
 *
 * Runner: node --loader ./scripts/ts-loader.mjs --experimental-strip-types --test src/lib/auto-match.test.ts
 *
 * Tests inject a minimal catalog via the optional third parameter of computeMatch,
 * avoiding the dynamic @/data/stickers.json import entirely.
 *
 * Sticker indices (sort_order position in the canonical 980-item array):
 *   fwc-01       → 0    (type=fwc,   group=_fwc, team_code=FWC)
 *   fwc-15       → 14   (type=fwc,   group=_fwc, team_code=FWC)
 *   mex-logo     → 19   (type=team_logo, group=A, team_code=MEX)
 *   mex-team     → 20   (type=team_photo, group=A, team_code=MEX)
 *   mex-5-montes → 24   (type=player, group=A, team_code=MEX)
 *   kor-logo     → 59   (type=team_logo, group=A, team_code=KOR) -- same group as MEX
 *   can-logo     → 99   (type=team_logo, group=B, team_code=CAN) -- different group from MEX
 *   bra-logo     → 179  (type=team_logo, group=C, team_code=BRA) -- different group from MEX
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeMatch, type CollectionState, type MatchResult } from "./auto-match";
import { __internal, STICKER_COUNT } from "./qr-engine";
import type { Sticker } from "./catalog";

const { packBitset, packRepes, bytesToB64 } = __internal;

// ---------- Catalog fixtures ----------

function makeSticker(
  id: string,
  teamCode: string,
  group: string,
  type: Sticker["type"]
): Sticker {
  return {
    id,
    code: id,
    name: id,
    display_name: id.toUpperCase(),
    team: teamCode,
    team_code: teamCode,
    number: 1,
    type,
    sort_order: 0,
    team_color: "#000000",
    group,
  };
}

/** A minimal 980-sticker catalog with specific stickers at known indices. */
function buildTestCatalog(): Sticker[] {
  const catalog: Sticker[] = [];
  for (let i = 0; i < STICKER_COUNT; i++) {
    // Default: generic sticker
    catalog.push(makeSticker(`sticker-${i}`, "GEN", "X", "player"));
  }
  // Override specific indices with real data (indices from stickers.json sort_order):
  catalog[0]  = makeSticker("fwc-01",       "FWC", "_fwc", "fwc");
  catalog[14] = makeSticker("fwc-15",       "FWC", "_fwc", "fwc");
  catalog[19] = makeSticker("mex-logo",     "MEX", "A",    "team_logo");
  catalog[20] = makeSticker("mex-team",     "MEX", "A",    "team_photo");
  catalog[24] = makeSticker("mex-5-montes", "MEX", "A",    "player");
  catalog[59] = makeSticker("kor-logo",     "KOR", "A",    "team_logo"); // same group as MEX
  catalog[99] = makeSticker("can-logo",     "CAN", "B",    "team_logo"); // different group
  catalog[179]= makeSticker("bra-logo",     "BRA", "C",    "team_logo"); // different group
  return catalog;
}

// ---------- Encoding helpers ----------

/** Build a CollectionState from explicit index→count mappings. */
function buildState(counts: Record<number, number>): CollectionState {
  const hasBools = new Array<boolean>(STICKER_COUNT).fill(false);
  const repeCounts = new Array<number>(STICKER_COUNT).fill(0);

  for (const [idx, count] of Object.entries(counts)) {
    const i = Number(idx);
    const c = Math.min(3, count);
    if (c > 0) hasBools[i] = true;
    repeCounts[i] = c;
  }

  return {
    hasBitset: bytesToB64(packBitset(hasBools)),
    repesBitset: bytesToB64(packRepes(repeCounts)),
  };
}

const EMPTY_STATE: CollectionState = buildState({});

const CATALOG = buildTestCatalog();

// ---------- Tests ----------

describe("computeMatch", () => {

  it("T1: empty states → empty result + warnings", async () => {
    const result: MatchResult = await computeMatch(EMPTY_STATE, EMPTY_STATE, CATALOG);

    assert.deepEqual(result.iCanGive, []);
    assert.deepEqual(result.iCanReceive, []);
    assert.deepEqual(result.balancedPairs, []);
    assert.equal(result.inferredFairness.delta, 0);
    assert.ok(
      result.warnings.some((w) => w.includes("No hay datos")),
      `Expected 'No hay datos' warning, got: ${JSON.stringify(result.warnings)}`
    );
  });

  it("T2: I have mex-5 repe (count=2), friend lacks → iCanGive", async () => {
    // mex-5-montes is at index 24
    const me = buildState({ 24: 2 });         // 2 copies of mex-5
    const friend = buildState({ 0: 1 });      // friend has fwc-01 but not mex-5

    const result = await computeMatch(me, friend, CATALOG);

    assert.ok(result.iCanGive.includes("mex-5-montes"), `iCanGive=${JSON.stringify(result.iCanGive)}`);
    assert.deepEqual(result.iCanReceive, []);  // friend has no duplicates
  });

  it("T3: symmetric same-team trade (1 MEX give ↔ 1 MEX receive) → score 11", async () => {
    // me: has mex-logo (idx 19) twice, lacks mex-team (idx 20)
    // friend: has mex-team (idx 20) twice, lacks mex-logo (idx 19)
    const me = buildState({ 19: 2 });          // mex-logo ×2, mex-team absent
    const friend = buildState({ 20: 2, 19: 0 }); // mex-team ×2, mex-logo absent — but 0 = not-owned

    const result = await computeMatch(me, friend, CATALOG);

    assert.ok(result.iCanGive.includes("mex-logo"));
    assert.ok(result.iCanReceive.includes("mex-team"));
    assert.equal(result.balancedPairs.length, 1);
    // same team (+10) + base (+1) = 11
    assert.equal(result.balancedPairs[0].score, 11);
  });

  it("T4: cross-team trade MEX give ↔ BRA receive → score 1", async () => {
    // me: has mex-5 (idx 24) twice, lacks bra-logo (idx 179)
    // friend: has bra-logo (idx 179) twice, lacks mex-5 (idx 24)
    const me = buildState({ 24: 2 });
    const friend = buildState({ 179: 2 });

    const result = await computeMatch(me, friend, CATALOG);

    assert.ok(result.iCanGive.includes("mex-5-montes"));
    assert.ok(result.iCanReceive.includes("bra-logo"));
    assert.equal(result.balancedPairs.length, 1);
    // different team, different group (A vs C) → base only (+1)
    assert.equal(result.balancedPairs[0].score, 1);
  });

  it("T5: fairness skew — I give 10, receive 2 → delta=8, warning fires", async () => {
    // me: has stickers at idx 0-9 with count=2 (10 repes), lacks stickers at idx 50-51
    // friend: has stickers at idx 50-51 with count=2 (2 repes), lacks stickers at idx 0-9
    const meCounts: Record<number, number> = {};
    for (let i = 0; i < 10; i++) meCounts[i] = 2;

    const friendCounts: Record<number, number> = {};
    friendCounts[50] = 2;
    friendCounts[51] = 2;
    // friend has all idx 0-9 marked as owned (count=1) so I can't give those
    // Actually we need friend to NOT have idx 0-9 for iCanGive to fire
    // Default state has 0 for everything, so friend doesn't have 0-9 — OK

    const me = buildState(meCounts);
    const friend = buildState(friendCounts);

    const result = await computeMatch(me, friend, CATALOG);

    assert.equal(result.iCanGive.length, 10);
    assert.equal(result.iCanReceive.length, 2);
    assert.equal(result.inferredFairness.delta, 8);
    assert.ok(
      result.warnings.some((w) => w.includes("Le estás dando muchas más")),
      `Expected skew warning, got: ${JSON.stringify(result.warnings)}`
    );
  });

  it("T6: same-group pairing MEX(A) give ↔ KOR(A) receive → score 6", async () => {
    // me: has mex-5 (idx 24) twice, lacks kor-logo (idx 59)
    // friend: has kor-logo (idx 59) twice, lacks mex-5 (idx 24)
    const me = buildState({ 24: 2 });
    const friend = buildState({ 59: 2 });

    const result = await computeMatch(me, friend, CATALOG);

    assert.ok(result.iCanGive.includes("mex-5-montes"));
    assert.ok(result.iCanReceive.includes("kor-logo"));
    assert.equal(result.balancedPairs.length, 1);
    // same group A (+5) + base (+1) = 6  (different teams, same group)
    assert.equal(result.balancedPairs[0].score, 6);
  });

  it("T7: FWC-for-FWC swap → score 4", async () => {
    // me: has fwc-01 (idx 0) twice, lacks fwc-15 (idx 14)
    // friend: has fwc-15 (idx 14) twice, lacks fwc-01 (idx 0)
    const me = buildState({ 0: 2 });
    const friend = buildState({ 14: 2 });

    const result = await computeMatch(me, friend, CATALOG);

    assert.ok(result.iCanGive.includes("fwc-01"));
    assert.ok(result.iCanReceive.includes("fwc-15"));
    assert.equal(result.balancedPairs.length, 1);
    // both FWC type (+3) + base (+1) = 4  (same team_code FWC → +10? no — wait)
    // Actually FWC stickers have team_code=FWC; +10 same team kicks in too → 14
    // Let me re-check: fwc-01 team_code=FWC, fwc-15 team_code=FWC → same team +10
    // AND both type=fwc → +3 → total = 1+10+3 = 14
    assert.equal(result.balancedPairs[0].score, 14);
  });

  it("T8: big collection (all 980 stickers as repes) → no crash, < 50ms", async () => {
    const allCounts: Record<number, number> = {};
    for (let i = 0; i < STICKER_COUNT; i++) allCounts[i] = 2;

    const meAll = buildState(allCounts);
    const friendNone = buildState({});

    const start = performance.now();
    const result = await computeMatch(meAll, friendNone, CATALOG);
    const elapsed = performance.now() - start;

    assert.ok(elapsed < 50, `Expected < 50ms, got ${elapsed.toFixed(1)}ms`);
    // me has repes for all 980 stickers; friend has nothing → iCanGive = all 980
    assert.equal(result.iCanGive.length, STICKER_COUNT);
    assert.equal(result.iCanReceive.length, 0);
  });

});
