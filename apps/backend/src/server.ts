import { app } from "./app";

async function start(): Promise<void> {
  try {
    await app.listen({ host: "0.0.0.0", port: 3333 });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void start();
