import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../src/managers/i18n-manager.js", () => ({
  i18n: { t: (k) => k, onChange: () => () => {} },
}));

import { SlotMachineHud } from "../../src/components/slot-machine.js";
import { SlotMachine } from "../../src/entities/slot-machine.js";
import { SLOT_MACHINE } from "../../src/configs/constants.js";

/** Build an event carrying clientX/clientY (happy-dom ignores them on the ctor). */
function pointer(type, x, y) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "clientX", { value: x });
  Object.defineProperty(e, "clientY", { value: y });
  return e;
}

describe("SlotMachineHud", () => {
  /** @type {HTMLElement} */
  let root;
  /** @type {SlotMachine} */
  let machine;
  /** @type {SlotMachineHud} */
  let hud;
  let onDrop;
  let onReroll;

  const allReels = () => root.querySelectorAll(".pk-slot-reel");
  const active = () =>
    root.querySelectorAll(".pk-slot-reel:not(.pk-slot-reel--locked)");
  const locked = () => root.querySelectorAll(".pk-slot-reel--locked");
  const rerollBtn = () => root.querySelector('[data-role="reroll"]');
  const ghosts = () => document.body.querySelectorAll(".pk-slot-ghost");

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    machine = new SlotMachine({ reelCount: 4 });
    machine.spin(["fire"], () => 0); // every active reel → "fire"
    onDrop = vi.fn(() => true);
    onReroll = vi.fn(() => {
      machine.spin(["fire"], () => 0); // re-spin re-rolls every reel
      machine.noteReroll();
      return true;
    });
    hud = new SlotMachineHud({
      machine,
      onDrop,
      onReroll,
      canAfford: () => true,
    });
    hud.mount(root);
  });

  afterEach(() => {
    hud.destroy();
    root.remove();
  });

  it("renders all reel slots: active reels plus locked ones", () => {
    expect(allReels().length).toBe(SLOT_MACHINE.REEL_COUNT_MAX); // 7
    expect(active().length).toBe(4);
    expect(locked().length).toBe(SLOT_MACHINE.REEL_COUNT_MAX - 4); // 3
  });

  it("marks filled active reels draggable and shows their icon", () => {
    for (const reel of active()) {
      expect(reel.classList.contains("pk-slot-reel--filled")).toBe(true);
      expect(reel.dataset.type).toBe("fire");
      expect(reel.querySelector("svg.pk-icon")).not.toBeNull();
    }
  });

  it("locked reels show a padlock and are not draggable", () => {
    expect(locked().length).toBe(3);
    for (const reel of locked()) {
      expect(reel.querySelector("svg.pk-icon")).not.toBeNull();
      expect(reel.classList.contains("pk-slot-reel--filled")).toBe(false);
    }
  });

  it("dragging a reel spawns a ghost then drops it, calling onDrop", () => {
    const reel = active()[1];
    reel.dispatchEvent(pointer("pointerdown", 10, 20));
    expect(ghosts().length).toBe(1);

    window.dispatchEvent(pointer("pointerup", 120, 240));
    expect(onDrop).toHaveBeenCalledWith("fire", 120, 240);
    expect(ghosts().length).toBe(0);
  });

  it("tags the drag ghost with its reel type so it keeps the icon color", () => {
    active()[1].dispatchEvent(pointer("pointerdown", 10, 20));
    expect(ghosts()[0].dataset.type).toBe("fire");
  });

  it("empties the source reel when the drop is applied", () => {
    active()[0].dispatchEvent(pointer("pointerdown", 5, 5));
    window.dispatchEvent(pointer("pointerup", 50, 50));
    expect(machine.typeAt(0)).toBeNull();
    expect(active()[0].classList.contains("pk-slot-reel--empty")).toBe(true);
  });

  it("keeps the reel filled when the drop is rejected", () => {
    onDrop.mockReturnValueOnce(false);
    active()[0].dispatchEvent(pointer("pointerdown", 5, 5));
    window.dispatchEvent(pointer("pointerup", 9999, 9999));
    expect(machine.typeAt(0)).toBe("fire");
    expect(active()[0].classList.contains("pk-slot-reel--filled")).toBe(true);
  });

  it("does not start a drag from a locked reel", () => {
    locked()[0].dispatchEvent(pointer("pointerdown", 5, 5));
    expect(ghosts().length).toBe(0);
  });

  it("enables re-spin whenever it can be afforded (even with every reel full)", () => {
    expect(rerollBtn().hasAttribute("disabled")).toBe(false);
  });

  it("re-spin click re-rolls all reels and calls onReroll", () => {
    rerollBtn().dispatchEvent(new Event("click", { bubbles: true }));
    expect(onReroll).toHaveBeenCalledOnce();
  });

  it("re-spin also fires when the lever is pulled (pointerdown)", () => {
    // The lever swings out from under the finger, so a native click can be
    // lost — pointerdown must drive the re-spin.
    rerollBtn().dispatchEvent(pointer("pointerdown", 0, 0));
    expect(onReroll).toHaveBeenCalledOnce();
  });

  it("does not fire re-spin when it cannot be afforded", () => {
    hud.destroy();
    hud = new SlotMachineHud({
      machine,
      onDrop,
      onReroll,
      canAfford: () => false,
    });
    hud.mount(root);
    expect(rerollBtn().hasAttribute("disabled")).toBe(true);
    rerollBtn().dispatchEvent(new Event("click", { bubbles: true }));
    expect(onReroll).not.toHaveBeenCalled();
  });

  it("shows the current re-spin cost", () => {
    const cost = root.querySelector('[data-role="cost"]');
    expect(cost.textContent).toBe(String(machine.rerollCost()));
  });

  it("dim state toggles the background-fade class", () => {
    hud.setDimmed(true);
    expect(root.querySelector(".pk-slot-machine--dimmed")).not.toBeNull();
    hud.setDimmed(false);
    expect(root.querySelector(".pk-slot-machine--dimmed")).toBeNull();
  });

  it("destroy() removes the element and any ghost, idempotently", () => {
    active()[0].dispatchEvent(pointer("pointerdown", 5, 5));
    expect(ghosts().length).toBe(1);
    hud.destroy();
    expect(root.querySelector(".pk-slot-machine")).toBeNull();
    expect(ghosts().length).toBe(0);
    hud.destroy();
    expect(root.querySelector(".pk-slot-machine")).toBeNull();
  });
});
