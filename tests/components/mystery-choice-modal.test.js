import { describe, it, expect, beforeEach, vi } from "vitest";
import { MysteryChoiceModal } from "../../src/components/mystery-choice-modal.js";
import { MYSTERY_CHOICE_TYPES } from "../../src/utils/mystery-choice.js";
import { BONUS_CATEGORIES } from "../../src/configs/bonus-defs.js";

const bonusChoice = (id, rarity, icon = "sparkles") => ({
  type: MYSTERY_CHOICE_TYPES.BONUS,
  def: { id, rarity, icon, category: BONUS_CATEGORIES.BONUS },
  rarity,
});

const malusChoice = (id, icon = "trending-down") => ({
  type: MYSTERY_CHOICE_TYPES.BONUS,
  def: { id, rarity: "malus", icon, category: BONUS_CATEGORIES.MALUS },
  rarity: "malus",
});

const currencyChoice = (currency, amount) => ({
  type: MYSTERY_CHOICE_TYPES.CURRENCY,
  currency,
  amount,
  rarity: "common",
});

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("MysteryChoiceModal", () => {
  it("renders one power card per choice", () => {
    const modal = new MysteryChoiceModal({
      choices: [
        bonusChoice("reward_coins_x3", "legendary"),
        bonusChoice("reward_bomb_radius", "rare"),
      ],
    });
    modal.open();
    const cards = document.querySelectorAll(".pk-power-card");
    expect(cards).toHaveLength(2);
    modal.destroy();
  });

  it("tags each card with its rarity modifier class", () => {
    const modal = new MysteryChoiceModal({
      choices: [bonusChoice("a", "legendary"), bonusChoice("b", "epic")],
    });
    modal.open();
    expect(document.querySelector(".pk-power-card--legendary")).not.toBeNull();
    expect(document.querySelector(".pk-power-card--epic")).not.toBeNull();
    modal.destroy();
  });

  it("renders a clickable card carrying its choose action and index", () => {
    const modal = new MysteryChoiceModal({
      choices: [bonusChoice("a", "rare"), bonusChoice("b", "epic")],
    });
    modal.open();
    const cards = document.querySelectorAll(".pk-power-card.gt-clickable");
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute("data-action")).toBe("choose");
    expect(cards[1].getAttribute("data-index")).toBe("1");
    modal.destroy();
  });

  it("renders a title, an icon and a description in each card", () => {
    const modal = new MysteryChoiceModal({
      choices: [bonusChoice("reward_coins_x3", "legendary")],
    });
    modal.open();
    const card = document.querySelector(".pk-power-card");
    expect(card.querySelector(".pk-power-card-title")).not.toBeNull();
    expect(card.querySelector(".pk-power-card-hero .pk-icon")).not.toBeNull();
    expect(card.querySelector(".pk-power-card-desc")).not.toBeNull();
    modal.destroy();
  });

  it("shows a duration and a type stat row per card", () => {
    const modal = new MysteryChoiceModal({
      choices: [bonusChoice("reward_coins_x3", "legendary")],
    });
    modal.open();
    const rows = document.querySelectorAll(".pk-power-card-list li");
    expect(rows).toHaveLength(2);
    modal.destroy();
  });

  it("renders a malus card with the malus rarity class and malus locale key", () => {
    const modal = new MysteryChoiceModal({
      choices: [malusChoice("malus_half_coins")],
    });
    modal.open();
    const card = document.querySelector(".pk-power-card--malus");
    expect(card).not.toBeNull();
    // Uses the bonus.malus.* namespace, not bonus.reward.* — so the title is
    // the resolved string, never the raw key.
    const title = card.querySelector(".pk-power-card-title").textContent;
    expect(title).not.toBe("bonus.reward.malus_half_coins");
    expect(title.length).toBeGreaterThan(0);
    modal.destroy();
  });

  it("renders currency fallback cards", () => {
    const modal = new MysteryChoiceModal({
      choices: [currencyChoice("coins", 60), currencyChoice("diamonds", 2)],
    });
    modal.open();
    const titles = [...document.querySelectorAll(".pk-power-card-title")].map(
      (t) => t.textContent,
    );
    expect(titles.some((t) => t.includes("60"))).toBe(true);
    expect(titles.some((t) => t.includes("2"))).toBe(true);
    modal.destroy();
  });

  it("fires onChoose with the clicked choice and closes", () => {
    const onChoose = vi.fn();
    const choices = [bonusChoice("a", "legendary"), bonusChoice("b", "rare")];
    const modal = new MysteryChoiceModal({ choices, onChoose });
    modal.open();
    const second = document.querySelectorAll(".pk-power-card")[1];
    second.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(choices[1]);
    expect(document.querySelector(".gt-modal-overlay")).toBeNull();
  });

  it("does not close on backdrop click (forced choice)", () => {
    const modal = new MysteryChoiceModal({
      choices: [bonusChoice("a", "rare"), bonusChoice("b", "epic")],
    });
    modal.open();
    const overlay = document.querySelector(".gt-modal-overlay");
    overlay.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(document.querySelector(".gt-modal-overlay")).not.toBeNull();
    modal.destroy();
  });

  it("destroy() removes the modal from the DOM", () => {
    const modal = new MysteryChoiceModal({
      choices: [bonusChoice("a", "rare")],
    });
    modal.open();
    modal.destroy();
    expect(document.querySelector(".gt-modal-overlay")).toBeNull();
  });
});
