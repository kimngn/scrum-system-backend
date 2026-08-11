/**
 * Server-side pending-action store for MCP write-tool confirmation.
 *
 * Flow:
 *   1. AI calls a write tool → controller stores the proposed action here and
 *      returns { requiresConfirmation: true } to the AI (no token exposed).
 *   2. The current HTTP request ends; the AI tells the user what it intends to
 *      do and asks for confirmation.
 *   3. The user sends a new HTTP request with an affirmative message (e.g. "yes").
 *   4. The controller calls peekPending() to detect the pending action, then
 *      consumePending() which validates expiry and deletes the entry in one
 *      atomic step, then executes the stored (untampered) args via MCP.
 *
 * Security properties:
 *   - No token is ever generated, stored, or exposed.  Confirmation is triggered
 *     solely by the user's affirmative message in a SEPARATE HTTP request.
 *   - One pending action per user.  A new proposal replaces any prior one,
 *     preventing unbounded memory growth.
 *   - Stored args are a snapshot taken at proposal time; any modification
 *     between proposal and confirmation is ignored because the controller
 *     always executes the STORED snapshot, not the current AI arguments.
 *   - Actions expire after WRITE_ACTION_TTL_MS (5 minutes).
 *   - One user cannot confirm another user's pending action: all operations
 *     are keyed by the server-verified userId from the session.
 *   - Execution is one-time-use: consumePending() deletes the entry on success.
 */

const WRITE_ACTION_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Map<string(userId), { toolName, args, expiresAt }>
const _store = new Map();

/**
 * Stores a proposed write action for the given user.
 * Replaces any existing pending action for that user.
 * Returns nothing — no token is generated or exposed.
 */
function storePending(userId, toolName, args) {
  _store.set(String(userId), {
    toolName,
    args: { ...args },
    expiresAt: Date.now() + WRITE_ACTION_TTL_MS,
  });
}

/**
 * Returns the pending action for a user without deleting it.
 * Returns null if there is no pending action or it has expired.
 */
function peekPending(userId) {
  const key = String(userId);
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return null;
  }
  return entry;
}

/**
 * Validates and consumes the pending action for a user (one-time use).
 * Returns the stored entry on success, or null if nothing is pending or
 * the action has expired.
 */
function consumePending(userId) {
  const entry = peekPending(userId);
  if (entry) _store.delete(String(userId));
  return entry;
}

/**
 * Discards the pending action for a user without executing it.
 * Safe to call even if no pending action exists.
 */
function clearPending(userId) {
  _store.delete(String(userId));
}

/** Exposed for testing only — do not call in production code. */
function _clearAll() {
  _store.clear();
}

module.exports = { storePending, peekPending, consumePending, clearPending, _clearAll };
