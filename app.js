import { ACCESSORIES, ANIMALS, TRACKS, newPhrase, nextHint, tapMove } from "./game.js";
import { createMusic } from "./music.js";

const get = id => document.getElementById(id);
const app = get("app");
const screens = { home: get("home-screen"), dress: get("dress-screen"), game: get("game-screen") };
const stage = get("stage");
const effects = get("effects");
const reward = get("reward");
const pads = get("pads");
const beads = get("beads");
const repeat = get("repeat");
const continueButton = get("continue");
const soundButtons = [...document.querySelectorAll(".sound")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const DANCE_BREAK = [0, 2, 1, 3, 2, 0, 3, 1, 2, 3];
const MOVES = [
  [{ transform: "rotate(-4deg)" }, { transform: "translateY(-24%) rotate(-11deg) scale(1.05)", offset: .43 }, { transform: "none" }],
  [{ transform: "rotate(0)" }, { transform: "translateY(-15%) rotate(16deg) scale(1.03)", offset: .37 }, { transform: "rotate(-12deg)", offset: .71 }, { transform: "none" }],
  [{ transform: "scale(1.09, .87)" }, { transform: "translateY(-25%) scale(.9, 1.08)", offset: .46 }, { transform: "none" }],
  [{ transform: "rotate(-8deg)" }, { transform: "translateX(12%) translateY(-11%) rotate(13deg)", offset: .54 }, { transform: "none" }],
];
const MESSAGES = {
  watch: ["שימי לב!", "הסתכלי על הבובות", "eye"],
  input: ["עכשיו תורך!", "געי בבובות לפי הסדר שראית", "tap"],
  retry: ["כמעט!", "בואי נראה שוב את הריקוד", "replay"],
  good: ["בדיוק ככה!", "", "spark"],
  party: ["איזה ריקוד, איימי!", "", "star"],
  pause: ["נמשיך לרקוד?", "", "note"],
  free: ["ריקוד חופשי", "געי בבובות כדי לנגן ולרקוד", "note"],
};

let view = "home";
let phase = "watch";
let track = 0;
let phraseIndex = 0;
let phrase = newPhrase(track, phraseIndex);
let cleared = Math.min(TRACKS.length, Math.max(0, Number.parseInt(load("cleared"), 10) || 0));
let accessory = ACCESSORIES.find(item => item.id === load("accessory"))?.id ?? ACCESSORIES[0].id;
const music = createMusic(load("music") !== "off");
const timers = new Set();
const cueTimers = new Map();

function load(key) {
  try { return localStorage.getItem(`pajama-disco:${key}`); }
  catch { return null; }
}

function save(key, value) {
  try { localStorage.setItem(`pajama-disco:${key}`, String(value)); }
  catch { /* Playing does not depend on local storage. */ }
}

function svg(icon, extraClass = "") {
  return `<svg class="icon ${extraClass}" aria-hidden="true"><use href="#i-${icon}"/></svg>`;
}

function drawCast(container, interactive = false, crew = ANIMALS) {
  return crew.map((animal, index) => {
    const actor = document.createElement(interactive ? "button" : "div");
    actor.className = "actor";
    actor.dataset.index = index;
    actor.style.setProperty("--index", index);
    actor.style.setProperty("--tint", animal.color);
    if (interactive) {
      actor.type = "button";
      actor.tabIndex = -1;
      actor.setAttribute("aria-label", animal.name);
      actor.addEventListener("click", () => dance(index));
    }
    actor.innerHTML = `<span class="shadow"></span>
      <span class="doll"><span class="figure">
        <img src="assets/${animal.id}.webp" width="400" height="400" alt="" draggable="false">
        ${animal.id === "bunny" ? '<span class="worn"></span>' : ""}
      </span></span>
      ${interactive ? `<span class="cue">${svg(animal.icon)}</span>` : ""}`;
    container.append(actor);
    return actor;
  });
}

drawCast(get("home-cast"));
drawCast(get("dress-cast"), false, [ANIMALS[0]]);
const actors = drawCast(get("game-cast"), true);

const padButtons = ANIMALS.map((animal, index) => {
  const pad = document.createElement("button");
  pad.type = "button";
  pad.className = "pad";
  pad.dataset.index = index;
  pad.style.setProperty("--tint", animal.color);
  pad.innerHTML = `${svg(animal.icon)}<span>${animal.name}</span>`;
  pad.addEventListener("click", () => dance(index));
  pads.append(pad);
  return pad;
});

function createChoices(container, options, select) {
  return options.map((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.innerHTML = `${svg(item.icon)}<span>${item.label}</span>`;
    button.addEventListener("click", () => select(index));
    container.append(button);
    return button;
  });
}

const accessoryButtons = createChoices(
  get("accessories"), ACCESSORIES.map(item => ({ icon: item.id, label: item.name })),
  index => {
    accessory = ACCESSORIES[index].id;
    save("accessory", accessory);
    updateDress();
    music.arm();
    music.note(TRACKS[track], index);
    animate(get("dress-cast").querySelector(".figure"), 0);
  },
);
const trackButtons = createChoices(
  get("track-choices"), TRACKS.map(item => ({ icon: item.icon, label: item.shortName })),
  index => { track = index; updateDress(); },
);

function drawStars(node, earned, current = -1) {
  node.innerHTML = TRACKS.map((_, index) => {
    const state = index < earned ? "earned" : index === current ? "current" : "";
    return svg("star", `star ${state}`);
  }).join("");
}

function updateHome() {
  const stars = get("home-stars");
  stars.hidden = cleared === 0;
  stars.setAttribute("aria-label", `${cleared} מתוך ${TRACKS.length} כוכבים נאספו`);
  drawStars(stars, cleared);
  get("home-free").hidden = cleared < TRACKS.length;
}

function updateDress() {
  document.querySelectorAll(".worn").forEach(item => { item.innerHTML = svg(accessory); });
  accessoryButtons.forEach((button, index) => {
    button.setAttribute("aria-pressed", String(ACCESSORIES[index].id === accessory));
  });
  get("select-track").hidden = cleared === 0;
  trackButtons.forEach((button, index) => {
    button.disabled = index > cleared;
    button.setAttribute("aria-pressed", String(index === track));
  });
}

function updateSound() {
  for (const button of soundButtons) {
    button.setAttribute("aria-label", music.enabled ? "השתקת מוזיקה" : "הפעלת מוזיקה");
    button.querySelector("use").setAttribute("href", music.enabled ? "#i-sound" : "#i-mute");
  }
}

function after(delay, action) {
  const id = setTimeout(() => {
    timers.delete(id);
    action();
  }, delay);
  timers.add(id);
  return id;
}

function cancelTimers() {
  for (const id of timers) clearTimeout(id);
  timers.clear();
  cueTimers.clear();
  for (const element of [...actors, ...padButtons]) element.classList.remove("active", "hinted");
  effects.replaceChildren();
}

function show(next) {
  cancelTimers();
  if (reward.open) reward.close();
  view = next;
  app.dataset.view = next;
  for (const [name, screen] of Object.entries(screens)) screen.hidden = name !== next;
}

function home() {
  music.quiet();
  show("home");
  updateHome();
}

function dress() {
  music.arm();
  music.sparkle(TRACKS[0]);
  show("dress");
  track = Math.min(cleared, TRACKS.length - 1);
  updateDress();
}

function setPhase(next) {
  phase = next;
  screens.game.dataset.phase = next;
  const [title, detail, icon] = MESSAGES[next];
  get("phase-title").textContent = title;
  const detailNode = get("phase-detail");
  detailNode.textContent = next === "input" && nextHint(phrase) !== undefined ? "געי בכפתור המואר" : detail;
  detailNode.hidden = detailNode.textContent === "";
  get("phase-icon").setAttribute("href", `#i-${icon}`);
  const acceptsTaps = next === "input" || next === "free";
  for (const button of [...actors, ...padButtons]) button.disabled = !acceptsTaps;
  repeat.hidden = next === "free";
  repeat.disabled = next !== "input";
  continueButton.hidden = next !== "pause";
  updateHint();
}

function drawBeads(count) {
  beads.innerHTML = phrase.moves.map((index, position) =>
    `<span class="bead ${position < count ? "active" : ""}" style="--bead:${ANIMALS[index].color}"></span>`,
  ).join("");
  beads.setAttribute("aria-label", `${count} מתוך ${phrase.moves.length} תנועות`);
}

function updateHint() {
  const next = phase === "input" ? nextHint(phrase) : undefined;
  actors.forEach((actor, index) => actor.classList.toggle("hinted", index === next));
  padButtons.forEach((pad, index) => pad.classList.toggle("hinted", index === next));
}

function updateTrack() {
  const selected = TRACKS[track];
  screens.game.dataset.track = selected.id;
  get("track-title").textContent = selected.name;
  const stars = get("track-stars");
  stars.hidden = phase === "free";
  stars.setAttribute("aria-label", `ריקוד ${phraseIndex + 1} מתוך ${selected.phrases.length}`);
  drawStars(stars, phraseIndex, phraseIndex);
}

function startTrack(index) {
  music.arm();
  show("game");
  track = index;
  phraseIndex = 0;
  phrase = newPhrase(track, phraseIndex);
  demo(420);
  updateTrack();
}

function startFree() {
  music.arm();
  show("game");
  track = TRACKS.length - 1;
  beads.replaceChildren();
  setPhase("free");
  updateTrack();
}

function animate(figure, index) {
  if (reducedMotion.matches || typeof figure.animate !== "function") return;
  figure.getAnimations().forEach(animation => animation.cancel());
  figure.animate(MOVES[index], { duration: 460, easing: "cubic-bezier(.17,.68,.31,1)" });
}

function burst(index, count) {
  if (reducedMotion.matches) return;
  const field = stage.getBoundingClientRect();
  const actor = actors[index]?.getBoundingClientRect();
  const x = actor ? actor.left - field.left + actor.width / 2 : field.width / 2;
  const y = actor ? actor.top - field.top + actor.height * .36 : field.height * .66;
  const palette = actor ? [ANIMALS[index].color, "#ffe89d", "#fff5dc"] : ANIMALS.map(item => item.color);
  const sparks = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const angle = (i + Math.random() * .8) / count * Math.PI * 2;
    const distance = 23 + Math.random() * (actor ? 40 : field.width * .40);
    const spark = document.createElement("i");
    spark.className = i % 3 ? "particle" : "particle twinkle";
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.setProperty("--piece", palette[i % palette.length]);
    spark.style.setProperty("--size", `${5 + Math.random() * 6}px`);
    spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * distance - 12}px`);
    spark.style.setProperty("--spin", `${angle * 95}deg`);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
    sparks.append(spark);
  }
  effects.append(sparks);
}

function cue(index, audible = true) {
  const actor = actors[index];
  const pad = padButtons[index];
  actor.classList.add("active");
  pad.classList.add("active");
  animate(actor.querySelector(".figure"), index);
  burst(index, 7);
  if (audible) music.note(TRACKS[track], index);

  const previous = cueTimers.get(index);
  if (previous !== undefined) {
    clearTimeout(previous);
    timers.delete(previous);
  }
  cueTimers.set(index, after(350, () => {
    actor.classList.remove("active");
    pad.classList.remove("active");
    cueTimers.delete(index);
  }));
}

function demo(delay = 230) {
  cancelTimers();
  phrase.position = 0;
  setPhase("watch");
  drawBeads(0);
  const beat = 60000 / TRACKS[track].tempo;
  phrase.moves.forEach((dancer, index) => after(delay + index * beat, () => {
    cue(dancer);
    drawBeads(index + 1);
  }));
  after(delay + phrase.moves.length * beat + 150, () => {
    drawBeads(0);
    setPhase("input");
  });
}

function dance(index) {
  if (phase === "free") {
    music.arm();
    cue(index);
    return;
  }
  if (phase !== "input") return;
  music.arm();
  const status = tapMove(phrase, index);
  cue(index);
  drawBeads(phrase.position);
  if (status === "retry") {
    setPhase("retry");
    music.nudge(TRACKS[track]);
    after(780, demo);
  } else if (status === "complete") {
    endPhrase();
  } else {
    updateHint();
  }
}

function endPhrase() {
  if (phraseIndex === TRACKS[track].phrases.length - 1) {
    cleared = Math.max(cleared, track + 1);
    save("cleared", cleared);
    party();
    return;
  }
  setPhase("good");
  drawStars(get("track-stars"), phraseIndex + 1);
  music.sparkle(TRACKS[track]);
  burst(undefined, 20);
  after(940, () => {
    phraseIndex += 1;
    phrase = newPhrase(track, phraseIndex);
    updateTrack();
    demo();
  });
}

function party() {
  setPhase("party");
  drawStars(get("track-stars"), TRACKS[track].phrases.length);
  const selected = TRACKS[track];
  const step = 30000 / selected.tempo;
  music.party(selected, DANCE_BREAK);
  burst(undefined, 30);
  DANCE_BREAK.forEach((index, i) => after(i * step, () => cue(index, false)));
  after(step * DANCE_BREAK.length, () => {
    for (let i = 0; i < ANIMALS.length; i += 1) cue(i, false);
    burst(undefined, 34);
  });
  after(step * DANCE_BREAK.length + 690, showReward);
}

function showReward() {
  if (reward.open) return;
  const final = track === TRACKS.length - 1;
  const stars = get("reward-stars");
  stars.setAttribute("aria-label", `${cleared} מתוך ${TRACKS.length} כוכבים נאספו`);
  drawStars(stars, cleared);
  get("reward-title").textContent = final ? "איימי, הרקדת את כולן!" : "איזה ריקוד!";
  get("reward-detail").textContent = final ? "שלוש רחבות, שלושה כוכבים!" : "הרחבה הבאה מחכה לך";
  get("reward-next").textContent = final ? "לריקוד חופשי" : "לרחבה הבאה";
  reward.showModal();
}

function pauseForBackground() {
  if (!document.hidden) return;
  music.quiet();
  if (view !== "game" || phase === "free" || reward.open) return;
  cancelTimers();
  if (phase === "party") {
    showReward();
  } else {
    if (phase === "good") {
      phraseIndex += 1;
      phrase = newPhrase(track, phraseIndex);
      updateTrack();
    }
    setPhase("pause");
  }
}

get("start").addEventListener("click", dress);
get("home-free").addEventListener("click", startFree);
get("dress-back").addEventListener("click", home);
get("game-back").addEventListener("click", home);
get("begin").addEventListener("click", () => startTrack(track));
get("reward-replay").addEventListener("click", () => startTrack(track));
get("reward-next").addEventListener("click", () => {
  if (track === TRACKS.length - 1) startFree();
  else startTrack(track + 1);
});
get("reward-home").addEventListener("click", home);
reward.addEventListener("cancel", event => { event.preventDefault(); home(); });
repeat.addEventListener("click", () => { if (phase === "input") demo(); });
continueButton.addEventListener("click", () => { music.arm(); demo(); });
for (const button of soundButtons) button.addEventListener("click", () => {
  music.toggle();
  save("music", music.enabled ? "on" : "off");
  updateSound();
});
document.addEventListener("visibilitychange", pauseForBackground);
window.addEventListener("load", () => {
  for (const item of TRACKS.slice(1)) {
    const image = new Image();
    image.src = `assets/${item.id}.jpg`;
  }
});

updateDress();
updateHome();
updateSound();
document.title = "דיסקו פיג׳מות";
