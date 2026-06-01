/**
 * peer-mock.ts — deterministic mock peer state for wishlist Phase A.
 *
 * Simulates multiplayer state until Firestore lands (Phase B).
 * Three friends with deterministic inventories + wishlists.
 *
 * Tomás  🟢 online  — has duplicates of MEX, ARG, BRA player stickers
 * Lucas  🟡 offline — has duplicates of ESP, FRA, GER player stickers
 * Mateo  🟢 online  — has duplicates of URU, COL, POR player stickers
 */

export interface MockPeer {
  uid: string;
  displayName: string;
  status: "online" | "offline";
  /** sticker_id → count (only stickers they own) */
  collection: Record<string, number>;
  /** ordered wishlist of sticker_ids */
  wishlist: string[];
}

// ---------------------------------------------------------------------------
// Mock peer definitions
// ---------------------------------------------------------------------------

const TOMAS: MockPeer = {
  uid: "mock_tomas",
  displayName: "Tomás",
  status: "online",
  collection: {
    // MEX duplicates
    "mex-2-malagon": 2,
    "mex-3-vasquez": 3,
    "mex-7-reyes": 2,
    "mex-10": 2,
    // ARG duplicates
    "arg-10-messi": 2,
    "arg-11": 2,
    // BRA player
    "bra-9": 2,
    "bra-10": 3,
    // FWC
    "fwc-01": 2,
  },
  wishlist: [
    "esp-10",
    "fra-7",
    "ger-9",
    "arg-10-messi",
    "bra-10",
  ],
};

const LUCAS: MockPeer = {
  uid: "mock_lucas",
  displayName: "Lucas",
  status: "offline",
  collection: {
    // ESP duplicates
    "esp-10": 2,
    "esp-7": 2,
    // FRA duplicates
    "fra-7": 3,
    "fra-10": 2,
    // GER duplicates
    "ger-9": 2,
    "ger-10": 2,
    // ARG
    "arg-10-messi": 1,
  },
  wishlist: [
    "mex-7-reyes",
    "arg-10-messi",
    "bra-9",
    "mex-3-vasquez",
  ],
};

const MATEO: MockPeer = {
  uid: "mock_mateo",
  displayName: "Mateo",
  status: "online",
  collection: {
    // URU duplicates
    "uru-7": 2,
    "uru-9": 2,
    // COL duplicates
    "col-7": 2,
    "col-10": 3,
    // POR duplicates
    "por-7-ronaldo": 2,
    "por-10": 2,
    // ARG/MEX crossover
    "arg-10-messi": 2,
    "mex-7-reyes": 2,
  },
  wishlist: [
    "esp-10",
    "fra-7",
    "mex-2-malagon",
    "bra-10",
    "arg-10-messi",
  ],
};

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

let _peers: MockPeer[] | null = null;

/** Returns the deterministic list of mock peers. Cached after first call. */
export function getMockPeers(): MockPeer[] {
  if (!_peers) {
    _peers = [TOMAS, LUCAS, MATEO];
  }
  return _peers;
}

/** Returns a single mock peer by uid, or undefined. */
export function getMockPeer(uid: string): MockPeer | undefined {
  return getMockPeers().find((p) => p.uid === uid);
}

/**
 * Returns all peers who have ≥2 of a given sticker_id.
 * Used for the demand badge on album tiles.
 */
export function getPeersWithDuplicate(sticker_id: string): MockPeer[] {
  return getMockPeers().filter((p) => (p.collection[sticker_id] ?? 0) >= 2);
}

/**
 * Returns all peers who have wishlisted a given sticker_id.
 * Used for "friends who want this" overlay in album.
 */
export function getPeersWishing(sticker_id: string): MockPeer[] {
  return getMockPeers().filter((p) => p.wishlist.includes(sticker_id));
}
