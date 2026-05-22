import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notify } from "../../src/managers/notification-manager.js";

describe("NotificationManager", () => {
  beforeEach(() => {
    notify.dismissAll();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    notify.dismissAll();
    vi.restoreAllMocks();
  });

  it("creates a container on first show()", () => {
    expect(document.querySelector(".pk-notif-container")).toBeNull();
    notify.show("Hello");
    expect(document.querySelector(".pk-notif-container")).not.toBeNull();
  });

  it("displays a notification element in the container", () => {
    notify.show("Test message");
    const el = document.querySelector(".pk-notif");
    expect(el).not.toBeNull();
    expect(el.textContent).toBe("Test message");
  });

  it("applies the correct type class", () => {
    notify.show("ok", { type: "success" });
    notify.show("fail", { type: "error" });
    notify.show("warn", { type: "warning" });
    notify.show("note", { type: "info" });

    const items = document.querySelectorAll(".pk-notif");
    expect(items[0].classList.contains("pk-notif--success")).toBe(true);
    expect(items[1].classList.contains("pk-notif--error")).toBe(true);
    expect(items[2].classList.contains("pk-notif--warning")).toBe(true);
    expect(items[3].classList.contains("pk-notif--info")).toBe(true);
  });

  it("convenience methods apply the correct type", () => {
    notify.success("s");
    notify.error("e");
    notify.warning("w");
    notify.info("i");

    const items = document.querySelectorAll(".pk-notif");
    expect(items[0].classList.contains("pk-notif--success")).toBe(true);
    expect(items[1].classList.contains("pk-notif--error")).toBe(true);
    expect(items[2].classList.contains("pk-notif--warning")).toBe(true);
    expect(items[3].classList.contains("pk-notif--info")).toBe(true);
  });

  it("adds the --visible class for entrance animation", () => {
    notify.show("Hello");
    const el = document.querySelector(".pk-notif");
    expect(el.classList.contains("pk-notif--visible")).toBe(true);
  });

  it("returns a unique id for each notification", () => {
    const id1 = notify.show("one");
    const id2 = notify.show("two");
    expect(id1).not.toBe(id2);
  });

  it("count reflects the number of active notifications", () => {
    expect(notify.count).toBe(0);
    notify.show("one");
    notify.show("two");
    expect(notify.count).toBe(2);
  });

  it("dismiss() removes a notification by id", () => {
    const id = notify.show("temp");
    expect(notify.count).toBe(1);
    notify.dismiss(id);
    expect(notify.count).toBe(0);
  });

  it("dismiss() adds --exit class for exit animation", () => {
    const id = notify.show("temp");
    const el = document.querySelector(".pk-notif");
    notify.dismiss(id);
    expect(el.classList.contains("pk-notif--exit")).toBe(true);
    expect(el.classList.contains("pk-notif--visible")).toBe(false);
  });

  it("dismissAll() removes all active notifications", () => {
    notify.show("one");
    notify.show("two");
    notify.show("three");
    expect(notify.count).toBe(3);
    notify.dismissAll();
    expect(notify.count).toBe(0);
  });

  it("auto-dismisses after the configured duration", () => {
    vi.useFakeTimers();
    notify.show("auto", { duration: 1000 });
    expect(notify.count).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(notify.count).toBe(0);
    vi.useRealTimers();
  });

  it("uses default duration when none specified", () => {
    vi.useFakeTimers();
    notify.show("auto");
    expect(notify.count).toBe(1);
    vi.advanceTimersByTime(3000);
    expect(notify.count).toBe(0);
    vi.useRealTimers();
  });

  it("evicts oldest when MAX_VISIBLE is exceeded", () => {
    const ids = [];
    for (let i = 0; i < 6; i++) {
      ids.push(notify.show(`msg ${i}`));
    }
    /* MAX_VISIBLE is 5, so first one should be dismissed. */
    expect(notify.count).toBe(5);
  });

  it("emits 'show' event when a notification is displayed", () => {
    const fn = vi.fn();
    const off = notify.on("show", fn);
    notify.show("hello", { type: "success" });
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "hello",
        type: "success",
      }),
    );
    off();
  });

  it("emits 'dismiss' event when a notification is dismissed", () => {
    const fn = vi.fn();
    const off = notify.on("dismiss", fn);
    const id = notify.show("bye");
    notify.dismiss(id);
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ id }));
    off();
  });

  it("dismiss() is a no-op for unknown id", () => {
    notify.show("one");
    notify.dismiss(999);
    expect(notify.count).toBe(1);
  });

  it("sets role=status and aria-live for accessibility", () => {
    notify.show("accessible");
    const el = document.querySelector(".pk-notif");
    expect(el.getAttribute("role")).toBe("status");
    expect(el.getAttribute("aria-live")).toBe("polite");
  });

  it("notifications stack (multiple visible at once)", () => {
    notify.show("first");
    notify.show("second");
    notify.show("third");
    const items = document.querySelectorAll(".pk-notif--visible");
    expect(items.length).toBe(3);
  });
});
