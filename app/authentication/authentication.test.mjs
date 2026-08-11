/**
 * Security tests for authentication.js
 *
 * Verifies:
 *   - Raw Authorization headers and tokens are never logged.
 *   - A forged / tampered token (one not encrypted with SECRET_KEY) cannot
 *     establish a user identity (decrypt throws; middleware returns 401).
 *   - An expired session returns 401.
 *   - A valid session causes authenticateRoute to set req.userId and call next().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);

// Models must be set up before authentication.js is loaded so spies are active.
const db = _require("../models/index.js");
const Session = db.session;

const sessionFindAllSpy = vi.spyOn(Session, "findAll");

// Load the module under test after spies are wired.
const { authenticateRoute } = _require("./authentication.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockReq(authHeader) {
  return {
    get: (name) => (name.toLowerCase() === "authorization" ? authHeader : undefined),
    userId: undefined,
  };
}

function mockRes() {
  const res = { _status: 200, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.send   = (body) => { res._body  = body;  return res; };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("authenticateRoute — credential logging", () => {
  it("does NOT log the raw Authorization header to console.log", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const token = "Bearer sometoken";

    sessionFindAllSpy.mockResolvedValue([]);
    const req  = mockReq(token);
    const res  = mockRes();
    await authenticateRoute(req, res, () => {});

    // console.log must never have been called with the token value.
    const calledWithToken = logSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === "string" && a.includes("sometoken")),
    );
    expect(calledWithToken).toBe(false);
    logSpy.mockRestore();
  });

  it("does NOT log the raw Authorization header to console.info", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    sessionFindAllSpy.mockResolvedValue([]);
    const req = mockReq("Bearer verysecrettoken");
    await authenticateRoute(req, mockRes(), () => {});
    const leaked = infoSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === "string" && a.includes("verysecrettoken")),
    );
    expect(leaked).toBe(false);
    infoSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("authenticateRoute — forged / invalid token", () => {
  it("returns 401 when the token is not encrypted with SECRET_KEY (forge attempt)", async () => {
    // A random base64 string that is NOT a valid AES-256-GCM ciphertext.
    const forgedToken = "Bearer " + Buffer.from("not-a-valid-ciphertext").toString("base64");
    const req = mockReq(forgedToken);
    const res = mockRes();
    await authenticateRoute(req, res, () => {});
    expect(res._status).toBe(401);
    // Session lookup must NOT have been called — the decrypt step should fail first.
    expect(sessionFindAllSpy).not.toHaveBeenCalled();
  });

  it("returns 401 when the session ID decrypts correctly but the session does not exist", async () => {
    sessionFindAllSpy.mockResolvedValue([]); // empty — session not found
    // Use the real encrypt to create a valid-format token whose session ID just
    // doesn't exist in the DB.
    const { encrypt } = _require("./crypto.js");
    const token = await encrypt(99999); // session ID that doesn't exist
    const req = mockReq("Bearer " + token);
    const res = mockRes();
    await authenticateRoute(req, res, () => {});
    expect(res._status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("authenticateRoute — expired session", () => {
  it("returns 401 when the session exists but has already expired", async () => {
    const { encrypt } = _require("./crypto.js");
    const token = await encrypt(1);
    const expiredSession = { id: 1, userId: 42, expirationDate: Date.now() - 1000 };
    sessionFindAllSpy.mockResolvedValue([expiredSession]);

    const req = mockReq("Bearer " + token);
    const res = mockRes();
    await authenticateRoute(req, res, () => {});
    expect(res._status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("authenticateRoute — valid session", () => {
  it("sets req.userId from the verified session and calls next()", async () => {
    const { encrypt } = _require("./crypto.js");
    const token = await encrypt(1);
    const validSession = { id: 1, userId: 7, expirationDate: Date.now() + 60_000 };
    sessionFindAllSpy.mockResolvedValue([validSession]);

    const req  = mockReq("Bearer " + token);
    const res  = mockRes();
    const next = vi.fn();
    await authenticateRoute(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe(7);
    // Must NOT have sent a 401.
    expect(res._status).toBe(200);
  });

  it("does not modify req.userId on an invalid token", async () => {
    const req = mockReq("Bearer invalid");
    const res = mockRes();
    const next = vi.fn();
    await authenticateRoute(req, res, next);
    expect(req.userId).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("authenticateRoute — missing header", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const req = mockReq(undefined);
    const res = mockRes();
    await authenticateRoute(req, res, () => {});
    expect(res._status).toBe(401);
  });
});
