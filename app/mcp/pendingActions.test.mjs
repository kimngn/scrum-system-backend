/**
 * Tests for pendingActions.js — server-side write-confirmation store.
 *
 * Security properties verified:
 *   1. No confirmation token is ever generated or returned.
 *   2. A write action proposed by the AI is stored but cannot be executed in
 *      the same request — execution requires a separate consumePending() call
 *      that only happens after the user sends an affirmative message.
 *   3. The AI cannot confirm its own write action (no token in schema/response).
 *   4. One user cannot confirm another user's pending action (per-user keying).
 *   5. Confirmed actions execute exactly once (one-time use).
 *   6. Expired actions cannot execute.
 *   7. Stored args are snapshotted at proposal time; post-proposal tampering
 *      is ignored.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);
const {
  storePending,
  peekPending,
  consumePending,
  clearPending,
  _clearAll,
} = _require("./pendingActions.js");

beforeEach(() => {
  _clearAll();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("storePending — no token exposed", () => {
  it("storePending returns undefined (no token)", () => {
    const result = storePending(1, "create_user_story", { title: "X" });
    expect(result).toBeUndefined();
  });

  it("peekPending returns the stored entry after proposal", () => {
    storePending(1, "create_user_story", { title: "X", projectId: 3 });
    const entry = peekPending(1);
    expect(entry).not.toBeNull();
    expect(entry.toolName).toBe("create_user_story");
    expect(entry.args.title).toBe("X");
    expect(entry.args.projectId).toBe(3);
  });

  it("stored entry has no token field", () => {
    storePending(1, "move_user_story", { storyId: 5 });
    const entry = peekPending(1);
    expect(entry).not.toHaveProperty("token");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("same-request execution prevention (architectural guarantee)", () => {
  it("peekPending after storePending shows the action is stored but NOT yet executed", () => {
    // Simulates the proposal path in the chat controller: the action is stored
    // and the request ends.  consumePending is never called in the same
    // request as storePending — only in the NEXT request when the user confirms.
    storePending(1, "create_user_story", { title: "X" });
    expect(peekPending(1)).not.toBeNull(); // stored, awaiting separate confirmation
  });

  it("the AI cannot confirm its own write action: there is no token in the API for it to supply", () => {
    // storePending returns undefined — there is nothing the AI could pass back
    // to trigger execution.  The only execution path is consumePending() called
    // by the controller after detecting an affirmative user message.
    const token = storePending(1, "move_user_story", { storyId: 5 });
    expect(token).toBeUndefined(); // no token to exploit
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("cross-user isolation", () => {
  it("user B cannot consume user A's pending action", () => {
    storePending(1, "create_user_story", { title: "X" });
    expect(consumePending(2)).toBeNull();      // user B: nothing
    expect(consumePending(1)).not.toBeNull();  // user A: success
  });

  it("each user has an independent pending action slot", () => {
    storePending(1, "create_user_story", { title: "A" });
    storePending(2, "move_user_story", { storyId: 9 });

    const a = consumePending(1);
    const b = consumePending(2);
    expect(a.toolName).toBe("create_user_story");
    expect(b.toolName).toBe("move_user_story");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("single execution guarantee", () => {
  it("consumePending executes exactly once — second call returns null", () => {
    storePending(1, "assign_user_story", { storyId: 3, userId: 7 });
    const first  = consumePending(1);
    const second = consumePending(1);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("peekPending is non-destructive; consumePending deletes the entry", () => {
    storePending(1, "move_user_story", { storyId: 2 });
    const peeked   = peekPending(1);
    const consumed = consumePending(1);
    expect(peeked).not.toBeNull();
    expect(consumed).not.toBeNull();
    expect(peekPending(1)).toBeNull(); // deleted after consume
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("clearPending — cancellation", () => {
  it("clearPending removes the action without returning it", () => {
    storePending(1, "create_user_story", { title: "X" });
    clearPending(1);
    expect(peekPending(1)).toBeNull();
    expect(consumePending(1)).toBeNull();
  });

  it("clearPending is safe to call when no action exists", () => {
    expect(() => clearPending(99)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("TTL / expiry", () => {
  it("expired action cannot be executed via consumePending", () => {
    const realNow = Date.now;
    let fakeTime  = realNow();
    Date.now = () => fakeTime;

    storePending(1, "move_user_story", { storyId: 5 });
    fakeTime += 6 * 60 * 1000; // advance 6 minutes past the 5-minute TTL
    expect(consumePending(1)).toBeNull();

    Date.now = realNow;
  });

  it("expired action is also invisible to peekPending", () => {
    const realNow = Date.now;
    let fakeTime  = realNow();
    Date.now = () => fakeTime;

    storePending(1, "create_user_story", { title: "X" });
    fakeTime += 6 * 60 * 1000;
    expect(peekPending(1)).toBeNull();

    Date.now = realNow;
  });

  it("a new proposal replaces an expired action for the same user", () => {
    const realNow = Date.now;
    let fakeTime  = realNow();
    Date.now = () => fakeTime;

    storePending(1, "create_user_story", { title: "Old" });
    fakeTime += 6 * 60 * 1000; // old action expires

    Date.now = realNow; // restore real time so new action does not expire
    storePending(1, "move_user_story", { storyId: 9 });

    const entry = consumePending(1);
    expect(entry).not.toBeNull();
    expect(entry.toolName).toBe("move_user_story");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("arg snapshot immutability", () => {
  it("mutating the original args object after storePending has no effect on stored entry", () => {
    const args = { title: "Original", projectId: 3 };
    storePending(1, "create_user_story", args);
    args.title = "Mutated";
    const entry = consumePending(1);
    expect(entry.args.title).toBe("Original");
  });

  it("a new proposal replaces the previous pending action for the same user", () => {
    storePending(1, "create_user_story", { title: "First" });
    storePending(1, "move_user_story", { storyId: 5 });
    const entry = consumePending(1);
    expect(entry.toolName).toBe("move_user_story");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("empty state", () => {
  it("consumePending returns null when there is no pending action for a user", () => {
    expect(consumePending(99)).toBeNull();
  });

  it("peekPending returns null when there is no pending action for a user", () => {
    expect(peekPending(99)).toBeNull();
  });
});
