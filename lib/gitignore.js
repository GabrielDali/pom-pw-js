import fs from "fs";
import path from "path";

const STATES_ENTRY = "states";

function hasStatesEntry(content) {
  return content
    .split(/\r?\n/)
    .some((line) => line.trim() === STATES_ENTRY || line.trim() === "states/");
}

export function ensureStatesInGitignore(targetPath) {
  const gitignorePath = path.join(targetPath, ".gitignore");

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, STATES_ENTRY + "\n", "utf-8");
    return;
  }

  const content = fs.readFileSync(gitignorePath, "utf-8");
  if (hasStatesEntry(content)) return;

  const trimmed = content.trimEnd();
  const suffix = trimmed ? "\n" + STATES_ENTRY + "\n" : STATES_ENTRY + "\n";
  fs.writeFileSync(gitignorePath, content.trimEnd() + suffix, "utf-8");
}
