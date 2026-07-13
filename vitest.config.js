import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      // crypto.js does Buffer.from(process.env.SECRET_KEY, "base64") at
      // module-load time, so tests need *some* valid base64 value here.
      // This is a test-only dummy key — never use it outside tests.
      SECRET_KEY: "dGVzdHNlY3JldGtleWZvcnRlc3Rz",
    },
  },
});