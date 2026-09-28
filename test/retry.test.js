import test from "node:test";
import assert from "node:assert/strict";
import { retryAsync } from "../functions/_shared/retry.js";

test("retryAsync retries a transient failure and returns the successful result", async () => {
  let attempts = 0;
  const result = await retryAsync(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary smtp timeout");
    return "sent";
  }, { attempts: 2 });

  assert.equal(result, "sent");
  assert.equal(attempts, 2);
});

test("retryAsync rethrows the final failure after all attempts", async () => {
  let attempts = 0;
  await assert.rejects(
    retryAsync(async () => {
      attempts += 1;
      throw new Error(`failure ${attempts}`);
    }, { attempts: 2 }),
    /failure 2/
  );
  assert.equal(attempts, 2);
});
