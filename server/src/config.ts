import path from "path";

const serverRoot = path.resolve(__dirname, "..");

export const config = {
  port: Number(process.env.PORT ?? 3001),
  setupPath: process.env.SETUP_PATH ?? path.resolve(serverRoot, "data", "setup.json"),
  defaultSqlitePath: path.resolve(serverRoot, "data", "app.sqlite3"),
  clientDistPath: path.resolve(serverRoot, "..", "client", "dist"),
  enableSeed: process.env.ENABLE_SEED !== "false"
};
