/**
 * friends.ts — Static FRIENDS dataset from data.jsx lines 27-32.
 *
 * dupIds / wantIds reference sticker_ids from the Albumix catalog.
 * Values from data.jsx use p1-p24 notation. We map these to the
 * real sequential player sticker IDs in the catalog (chi-p{N} style).
 *
 * Since the catalog uses team-prefixed IDs (e.g. "chi-02", "arg-02"),
 * and we don't have a real Firebase album per friend, these IDs are
 * kept as opaque strings — the UI uses them for display only (count).
 */

export interface Friend {
  id: string;
  name: string;
  pts: number;
  /** Sticker IDs this friend has as duplicates (can offer) */
  dupIds: string[];
  /** Sticker IDs this friend is looking for */
  wantIds: string[];
}

/**
 * Five mock friends with their fantasy points and album state.
 * Points are fixed per data.jsx (not computed dynamically).
 */
export const FRIENDS: Friend[] = [
  {
    id: "benja",
    name: "Benja",
    pts: 1840,
    dupIds: ["chi-18", "chi-07", "chi-21"],
    wantIds: ["chi-01", "chi-17"],
  },
  {
    id: "sofi",
    name: "Sofi",
    pts: 1620,
    dupIds: ["chi-10", "chi-22", "chi-03"],
    wantIds: ["chi-02", "chi-16"],
  },
  {
    id: "vicente",
    name: "Vicente",
    pts: 1390,
    dupIds: ["chi-14", "chi-23", "chi-05"],
    wantIds: ["chi-01", "chi-18"],
  },
  {
    id: "agus",
    name: "Agus",
    pts: 1180,
    dupIds: ["chi-24", "chi-20"],
    wantIds: ["chi-03"],
  },
  {
    id: "flo",
    name: "Flo",
    pts: 980,
    dupIds: ["chi-09", "chi-13"],
    wantIds: ["chi-21"],
  },
];
