(function () {
  "use strict";

  const votes = { pizza: 0, icecream: 0 };
  const RESPAWN_MS = 700;

  const els = {
    pizza: document.getElementById("score-pizza"),
    icecream: document.getElementById("score-icecream"),
    bottle: document.getElementById("bottle"),
    reset: document.getElementById("btn-reset"),
    hint: document.getElementById("hint"),
    stage: document.getElementById("stage"),
  };

  const holes = {
    pizza: document.getElementById("hole-pizza"),
    icecream: document.getElementById("hole-icecream"),
  };

  /** Each vote type: hole + bin (both register a vote; only the hole flashes). */
  const dropZones = {
    pizza: [holes.pizza, document.getElementById("bin-pizza")],
    icecream: [holes.icecream, document.getElementById("bin-icecream")],
  };

  let drag = null;
  let homeRect = null;
  let respawnTimer = null;
  let isConsuming = false;

  function saveHome() {
    const r = els.bottle.getBoundingClientRect();
    const s = els.stage.getBoundingClientRect();
    homeRect = {
      left: ((r.left - s.left) / s.width) * 100,
      top: ((r.top - s.top) / s.height) * 100,
    };
  }

  function render() {
    els.pizza.textContent = String(votes.pizza);
    els.icecream.textContent = String(votes.icecream);
  }

  function hintMsg(text, ok) {
    els.hint.textContent = text;
    els.hint.classList.toggle("is-ok", Boolean(ok));
  }

  function allZones() {
    return Object.values(dropZones).flat();
  }

  function clearTargets() {
    allZones().forEach((z) => z.classList.remove("is-target", "is-voted"));
  }

  function goHome() {
    if (!homeRect) return;
    els.bottle.style.left = homeRect.left + "%";
    els.bottle.style.top = homeRect.top + "%";
    els.bottle.style.width = "";
    els.bottle.classList.remove("is-dragging");
  }

  function showBottle() {
    els.bottle.classList.remove("is-hidden");
    isConsuming = false;
    goHome();
  }

  function hideBottle() {
    els.bottle.classList.add("is-hidden");
  }

  /** True when bottle center sits inside the zone (or rects overlap enough). */
  function bottleHitsZone(bottleRect, zoneRect) {
    const cx = bottleRect.left + bottleRect.width / 2;
    const cy = bottleRect.top + bottleRect.height / 2;

    const centerInside =
      cx >= zoneRect.left &&
      cx <= zoneRect.right &&
      cy >= zoneRect.top &&
      cy <= zoneRect.bottom;

    if (centerInside) return true;

    const overlapX =
      Math.min(bottleRect.right, zoneRect.right) - Math.max(bottleRect.left, zoneRect.left);
    const overlapY =
      Math.min(bottleRect.bottom, zoneRect.bottom) - Math.max(bottleRect.top, zoneRect.top);

    if (overlapX <= 0 || overlapY <= 0) return false;

    const overlapArea = overlapX * overlapY;
    const bottleArea = bottleRect.width * bottleRect.height;
    return overlapArea >= bottleArea * 0.35;
  }

  /** Which vote type the bottle is over, if any. */
  function getDropTarget() {
    const bottleRect = els.bottle.getBoundingClientRect();

    for (const [type, zones] of Object.entries(dropZones)) {
      for (const zone of zones) {
        if (bottleHitsZone(bottleRect, zone.getBoundingClientRect())) {
          return type;
        }
      }
    }
    return null;
  }

  function flashHole(type) {
    const hole = holes[type];
    if (!hole) return;
    hole.classList.add("is-voted");
    hole.addEventListener("animationend", () => hole.classList.remove("is-voted"), {
      once: true,
    });
  }

  function registerVote(type) {
    if (type !== "pizza" && type !== "icecream" || isConsuming) return;

    isConsuming = true;
    votes[type] += 1;
    render();
    flashHole(type);
    hideBottle();

    hintMsg(
      type === "pizza" ? "Vote counted for Pizza!" : "Vote counted for Ice cream!",
      true
    );

    clearTimeout(respawnTimer);
    respawnTimer = setTimeout(() => {
      showBottle();
      hintMsg("Drag the bottle to a hole to vote", false);
    }, RESPAWN_MS);
  }

  function updateTargetHighlight() {
    clearTargets();
    const type = getDropTarget();
    if (type && holes[type]) {
      holes[type].classList.add("is-target");
    }
  }

  /* Pointer drag */
  els.bottle.addEventListener("pointerdown", (e) => {
    if (isConsuming) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const br = els.bottle.getBoundingClientRect();
    drag = { id: e.pointerId, ox: e.clientX - br.left, oy: e.clientY - br.top };
    els.bottle.classList.add("is-dragging");
    els.bottle.setPointerCapture(e.pointerId);
    moveAt(e.clientX, e.clientY);
  });

  function moveAt(x, y) {
    if (!drag) return;
    const sr = els.stage.getBoundingClientRect();
    const left = ((x - drag.ox - sr.left) / sr.width) * 100;
    const top = ((y - drag.oy - sr.top) / sr.height) * 100;
    els.bottle.style.left = left + "%";
    els.bottle.style.top = top + "%";
    els.bottle.style.width = "5.94%";
    updateTargetHighlight();
  }

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    els.bottle.releasePointerCapture(e.pointerId);
    drag = null;
    els.bottle.classList.remove("is-dragging");

    const type = getDropTarget();
    clearTargets();

    if (type) {
      registerVote(type);
    } else {
      goHome();
    }
  }

  els.bottle.addEventListener("pointermove", (e) => {
    if (drag && e.pointerId === drag.id) moveAt(e.clientX, e.clientY);
  });
  els.bottle.addEventListener("pointerup", endDrag);
  els.bottle.addEventListener("pointercancel", endDrag);

  els.reset.addEventListener("click", () => {
    clearTimeout(respawnTimer);
    votes.pizza = 0;
    votes.icecream = 0;
    render();
    showBottle();
    hintMsg("Scores reset", true);
    setTimeout(() => hintMsg("Drag the bottle to a hole to vote", false), 1500);
  });

  window.addEventListener("resize", saveHome);
  saveHome();
  render();
})();
