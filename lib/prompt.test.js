import readline from "readline";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { askLanguage } from "./prompt.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeFakeStdin() {
  const dataListeners = [];
  const onceListeners = [];
  return {
    isTTY: true,
    setRawMode: vi.fn(),
    resume: vi.fn(),
    setEncoding: vi.fn(),
    pause: vi.fn(),
    on(ev, fn) {
      if (ev === "data") dataListeners.push(fn);
      return this;
    },
    once(ev, fn) {
      if (ev === "data") onceListeners.push(fn);
      return this;
    },
    removeListener(ev, fn) {
      if (ev === "data") {
        const i = dataListeners.indexOf(fn);
        if (i !== -1) dataListeners.splice(i, 1);
      }
      return this;
    },
    emitData(chunk) {
      const onceFns = [];
      while (onceListeners.length) onceFns.push(onceListeners.shift());
      onceFns.forEach((fn) => fn(chunk));
      dataListeners.forEach((fn) => fn(chunk));
    },
  };
}

describe("askLanguage", () => {
  it("resolves with 'js' immediately when stdin is not a TTY", async () => {
    const result = await askLanguage();
    expect(result).toBe("js");
  });

  it("returns a string value", async () => {
    const result = await askLanguage();
    expect(typeof result).toBe("string");
    expect(["js", "ts"]).toContain(result);
  });

  describe("when stdin is a TTY", () => {
    let fakeStdin;
    let originalStdin;

    beforeEach(() => {
      fakeStdin = makeFakeStdin();
      originalStdin = process.stdin;
      Object.defineProperty(process, "stdin", {
        value: fakeStdin,
        writable: true,
        configurable: true,
      });
      vi.spyOn(process.stdout, "write").mockImplementation(() => {});
      vi.spyOn(readline, "cursorTo").mockImplementation(() => {});
    });

    afterEach(() => {
      Object.defineProperty(process, "stdin", {
        value: originalStdin,
        writable: true,
        configurable: true,
      });
    });

    it("resolves with 'js' when Enter is pressed on default option", async () => {
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\r");
      const result = await p;
      expect(result).toBe("js");
    });

    it("resolves with 'ts' after arrow right then Enter", async () => {
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\u001b[C");
      fakeStdin.emitData("\r");
      const result = await p;
      expect(result).toBe("ts");
    });

    it("resolves with 'js' after arrow left from TS", async () => {
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\u001b[C");
      fakeStdin.emitData("\u001b[D");
      fakeStdin.emitData("\r");
      const result = await p;
      expect(result).toBe("js");
    });

    it("handles newline key as Enter", async () => {
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\n");
      const result = await p;
      expect(result).toBe("js");
    });

    it("handles two-chunk escape sequence for arrow right", async () => {
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\u001b");
      fakeStdin.emitData("[C");
      fakeStdin.emitData("\r");
      const result = await p;
      expect(result).toBe("ts");
    });

    it("handles two-chunk escape sequence for arrow left", async () => {
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\u001b[C");
      fakeStdin.emitData("\u001b");
      fakeStdin.emitData("[D");
      fakeStdin.emitData("\r");
      const result = await p;
      expect(result).toBe("js");
    });

    it("handles OC escape for arrow right", async () => {
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\u001bOC");
      fakeStdin.emitData("\r");
      const result = await p;
      expect(result).toBe("ts");
    });

    it("handles OD escape for arrow left", async () => {
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\u001b[C");
      fakeStdin.emitData("\u001bOD");
      fakeStdin.emitData("\r");
      const result = await p;
      expect(result).toBe("js");
    });

    it("calls process.exit(130) on Ctrl+C", async () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});
      const p = askLanguage();
      await Promise.resolve();
      fakeStdin.emitData("\u0003");
      expect(exitSpy).toHaveBeenCalledWith(130);
    });
  });
});
