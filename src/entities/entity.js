/**
 * Base class for pure data/logic entities. Has zero DOM dependency on
 * purpose: entities must remain unit-testable in happy-dom without ever
 * touching the renderer.
 *
 * Subclasses describe a *thing in the game world* (a tile, an enemy, a
 * pickup); they must not perform IO or mutate the DOM. Move that logic into
 * a manager or a component.
 */
let nextId = 1;

export class Entity {
  /** @type {number} Unique numeric id (in-process). */
  id;

  /** @type {string} Free-form type tag — `'tile'`, `'enemy'`, … */
  type;

  /**
   * @param {{ id?: number, type?: string }} [opts]
   */
  constructor({ id, type = "entity" } = {}) {
    this.id = id ?? nextId++;
    this.type = type;
  }

  /**
   * Serialise to a JSON-safe payload. Override in subclasses; keep the
   * `id` and `type` fields so `fromJSON` round-trips cleanly.
   * @returns {object}
   */
  toJSON() {
    return { id: this.id, type: this.type };
  }
}
