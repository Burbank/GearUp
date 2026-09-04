"use strict";

const assert = require("assert");

const store = Object.create(null);
let cookie = "";

global.localStorage = {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key, value) {
    store[key] = String(value);
  },
  removeItem(key) {
    delete store[key];
  },
};

Object.defineProperty(global, "document", {
  value: {
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      const raw = String(value);
      const pair = raw.split(";")[0];
      const eq = pair.indexOf("=");
      const name = (eq < 0 ? pair : pair.slice(0, eq)).trim();
      const val = (eq < 0 ? "" : pair.slice(eq + 1)).trim();
      if (/Max-Age=0/i.test(raw) || val === "") {
        cookie = cookie
          .split(";")
          .map((p) => p.trim())
          .filter((p) => p && !p.startsWith(name + "="))
          .join("; ");
        return;
      }
      cookie = name + "=" + val;
    },
  },
  configurable: true,
});

global.location = { protocol: "http:", search: "" };

const C = require("../js/ack-copy.js");
const S = require("../js/ack-storage.js");

assert.strictEqual(C.ACK_STORAGE_KEY, "gearup4u.ack.v1");
assert.strictEqual(C.ACK_COOKIE_NAME, "gearup4u_ack");
assert.strictEqual(C.ACK_VERSION, 1);
assert.strictEqual(C.ACK_TEXT_HASH, "edu-not-ops-v1");
assert.ok(C.ACK_BODY.includes("not a source for flight operations"));
assert.strictEqual(S.hasValidAck(), false);

S.persistAck();
assert.strictEqual(S.hasValidAck(), true);
assert.strictEqual(S.readRecord().textHash, "edu-not-ops-v1");
assert.ok(String(document.cookie).includes("gearup4u_ack=edu-not-ops-v1"));

S.clearAck();
assert.strictEqual(S.hasValidAck(), false);

document.cookie = "gearup4u_ack=edu-not-ops-v1; Max-Age=31536000; Path=/; SameSite=Lax";
assert.strictEqual(S.hasValidAck(), true, "cookie alone is a valid ack");

S.clearAck();
localStorage.setItem(
  C.ACK_STORAGE_KEY,
  JSON.stringify({ version: 1, textHash: "old-hash", at: 1 })
);
assert.strictEqual(S.hasValidAck(), false, "wrong hash is not valid");

global.location.search = "?ack=reset";
assert.strictEqual(S.wantsReset(), true);
global.location.search = "?v=391#CYYZ";
assert.strictEqual(S.wantsReset(), false);

console.log("ack-gate ok");
