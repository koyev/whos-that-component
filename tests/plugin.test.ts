import { describe, it } from "node:test";
import assert from "node:assert/strict";
import wte from "../src/vite.ts";

describe("wte — plugin identity", () => {
  it("returns a plugin with the correct name", () => {
    const plugin = wte() as any;
    assert.equal(plugin.name, "whos-that-element");
  });

  it("applies only during serve", () => {
    const plugin = wte() as any;
    assert.equal(plugin.apply, "serve");
  });
});

describe("wte — transform", () => {
  it("returns null for node_modules paths", () => {
    const plugin = wte() as any;
    const result = plugin.transform("code", "/project/node_modules/react/index.jsx");
    assert.equal(result, null);
  });

  it("returns null for .git paths", () => {
    const plugin = wte() as any;
    const result = plugin.transform("code", "/project/.git/config");
    assert.equal(result, null);
  });

  it("returns null for unsupported extensions", () => {
    const plugin = wte() as any;
    assert.equal(plugin.transform("code", "/project/src/styles.css"), null);
  });

  it("returns null when options.enabled is false", () => {
    const plugin = wte({ enabled: false }) as any;
    const result = plugin.transform(
      `export default function A() { return <div>hi</div>; }`,
      "/src/App.tsx",
    );
    assert.equal(result, null);
  });

  it("returns null when NODE_ENV is production", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const plugin = wte() as any;
      assert.equal(
        plugin.transform(`export default function A() { return <div>hi</div>; }`, "/src/App.tsx"),
        null,
      );
    } finally {
      process.env.NODE_ENV = original;
    }
  });

  it("injects data-wte in development", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const plugin = wte() as any;
      const result = plugin.transform(
        `export default function A() { return <div>hi</div>; }`,
        "/src/App.tsx",
      );
      assert.ok(result, "should return a result in development");
      assert.match(result.code, /data-wte=/);
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});

describe("wte — options", () => {
  it("accepts triggerKey option without throwing", () => {
    assert.doesNotThrow(() => wte({ triggerKey: "Meta" }));
  });

  it("accepts editor option without throwing", () => {
    assert.doesNotThrow(() => wte({ editor: "cursor" }));
  });
});
