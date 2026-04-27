import { describe, it, expect } from "vitest";
import { Entity } from "../../src/entities/entity.js";

describe("Entity", () => {
  it("auto-assigns a unique id", () => {
    const a = new Entity();
    const b = new Entity();
    expect(a.id).not.toBe(b.id);
  });

  it("respects an explicit id and type", () => {
    const e = new Entity({ id: 7, type: "tile" });
    expect(e.id).toBe(7);
    expect(e.type).toBe("tile");
  });

  it("serialises to JSON-safe payload", () => {
    const e = new Entity({ type: "enemy" });
    const json = e.toJSON();
    expect(json.type).toBe("enemy");
    expect(typeof json.id).toBe("number");
  });
});
