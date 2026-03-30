import { spawn } from "node:child_process";
import net from "node:net";

const isWindows = process.platform === "win32";

const normalizeCwd = (cwd) => {
  if (!isWindows) return cwd;
  return cwd.replace(/^\\\\\?\\([A-Za-z]:\\)/, "$1");
};

const cwd = normalizeCwd(process.cwd());

if (cwd !== process.cwd()) {
  process.chdir(cwd);
}

const getCommand = (script) => {
  if (isWindows) {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", `npm.cmd run ${script}`],
    };
  }

  return {
    command: "npm",
    args: ["run", script],
  };
};

const canListenOnPort = (port) =>
  new Promise((resolve) => {
    const tester = net.createServer();

    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, "0.0.0.0");
  });

const findAvailablePort = async (startPort, maxAttempts = 10) => {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = startPort + offset;
    if (await canListenOnPort(port)) {
      return port;
    }
  }

  throw new Error(`Unable to find an open port starting from ${startPort}`);
};

const processes = [];
let shuttingDown = false;

const spawnTask = (name, script, extraEnv = {}) => {
  const { command, args } = getCommand(script);
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;

    shuttingDown = true;

    for (const proc of processes) {
      if (proc.pid && proc.pid !== child.pid) {
        proc.kill("SIGTERM");
      }
    }

    if (signal) {
      console.error(`${name} exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`Failed to start ${name}:`, error);
    process.exit(1);
  });

  processes.push(child);
};

const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const proc of processes) {
    if (proc.pid) {
      proc.kill("SIGTERM");
    }
  }

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const backendPort = await findAvailablePort(Number(process.env.PORT || 8787));

if (backendPort !== Number(process.env.PORT || 8787)) {
  console.log(`Using backend port ${backendPort} for this dev session.`);
}

spawnTask("server", "server:dev", { PORT: String(backendPort) });
spawnTask("vite", "dev", { VITE_API_PROXY_TARGET: `http://localhost:${backendPort}` });
