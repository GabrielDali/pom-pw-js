import readline from "readline";

const GREEN = "\x1b[32m";
const UNDERLINE = "\x1b[4m";
const RESET = "\x1b[0m";

export function askLanguage() {
  return new Promise((resolve) => {
    let index = 0;
    const options = ["JS", "TS"];
    const values = ["js", "ts"];

    function render() {
      const line =
        options
          .map((opt, i) => {
            const selected = i === index;
            const text = selected ? `${GREEN}${UNDERLINE}${opt}${RESET}` : opt;
            return text;
          })
          .join("   ") + "  (← → arrows, Enter to confirm)";
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`Select programming language JS/TS:  ${line}`);
    }

    process.stdout.write("\n");
    render();

    const stdin = process.stdin;
    if (!stdin.isTTY) {
      resolve("js");
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function onData(key) {
      if (key === "\u0003") {
        cleanup();
        process.exit(130);
      }
      if (key === "\r" || key === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(values[index]);
        return;
      }
      if (key === "\u001b[C" || key === "\u001bOC") {
        index = Math.min(index + 1, options.length - 1);
        render();
      } else if (key === "\u001b[D" || key === "\u001bOD") {
        index = Math.max(index - 1, 0);
        render();
      } else if (key === "\u001b") {
        stdin.once("data", (rest) => {
          if (rest === "[C" || rest === "OC") index = Math.min(index + 1, options.length - 1);
          else if (rest === "[D" || rest === "OD") index = Math.max(index - 1, 0);
          render();
        });
      }
    }

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on("data", onData);
  });
}
