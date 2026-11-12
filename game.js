export const ANIMALS = [
  { id: "bunny", name: "בּוּנִי", icon: "heart", color: "#ff9acb" },
  { id: "cat", name: "מִיצִי", icon: "star", color: "#c2a7ff" },
  { id: "frog", name: "קְוָאק", icon: "flower", color: "#8bf0ce" },
  { id: "bear", name: "דּוּבִּי", icon: "moon", color: "#ffcf81" },
];

export const ACCESSORIES = [
  { id: "bow", name: "פפיון" },
  { id: "bloom", name: "פרח" },
  { id: "crown", name: "כתר" },
];

export const TRACKS = [
  {
    id: "pillows", name: "מסיבת כריות", shortName: "כריות", icon: "heart",
    notes: [523.25, 659.25, 783.99, 880], tempo: 101,
    phrases: [[0, 1], [2, 0, 3], [1, 3, 2, 0]],
  },
  {
    id: "clouds", name: "רחבת העננים", shortName: "עננים", icon: "flower",
    notes: [587.33, 739.99, 880, 987.77], tempo: 105,
    phrases: [[2, 1, 0], [3, 2, 2, 1], [0, 3, 1, 2, 0]],
  },
  {
    id: "stars", name: "מופע הכוכבים", shortName: "כוכבים", icon: "star",
    notes: [392, 493.88, 587.33, 659.25], tempo: 110,
    phrases: [[0, 1, 3, 2], [1, 1, 0, 2, 3], [3, 2, 0, 1, 2, 3]],
  },
];

export function newPhrase(track, index) {
  return { moves: TRACKS[track].phrases[index], position: 0, misses: 0 };
}

export function tapMove(phrase, dancer) {
  if (phrase.position >= phrase.moves.length) return "complete";
  if (dancer !== phrase.moves[phrase.position]) {
    phrase.position = 0;
    phrase.misses += 1;
    return "retry";
  }
  phrase.position += 1;
  return phrase.position === phrase.moves.length ? "complete" : "hit";
}

export function nextHint(phrase) {
  return phrase.misses >= 2 ? phrase.moves[phrase.position] : undefined;
}
