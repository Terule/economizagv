import { spawn } from "node:child_process";

const intervalMs =
  Math.max(1, Number(process.env.COLLECTION_INTERVAL_HOURS ?? "24")) *
  3_600_000;
async function collect() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", "worker"], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Coleta encerrou com código ${code}`)),
    );
  });
}
while (true) {
  try {
    await collect();
  } catch (error) {
    console.error("Coleta agendada falhou", error);
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
