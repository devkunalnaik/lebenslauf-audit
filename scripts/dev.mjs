import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npm, ["run", "dev", "--workspace", "server"], {
    stdio: "inherit",
    shell: process.platform === "win32"
  }),
  spawn(npm, ["run", "dev", "--workspace", "client"], {
    stdio: "inherit",
    shell: process.platform === "win32"
  })
];

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill("SIGINT");
  }
}

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
    stopChildren();
  });
}

process.on("SIGINT", stopChildren);
process.on("SIGTERM", stopChildren);
