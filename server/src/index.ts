import { createApp } from "./app";
import { config } from "./config";
import { isInstalled } from "./services/dbService";
import { readSetupState } from "./services/setupService";
import { createSqliteAdapter } from "./db/sqliteAdapter";
import { runMigrations } from "./db/migration";

const boot = async () => {
  // Run DB migrations on startup if app is installed
  if (isInstalled()) {
    const setup = readSetupState();
    if (setup) {
      console.log("Running database migrations...");
      const db = createSqliteAdapter(setup.db.sqlitePath);
      try {
        await runMigrations(db);
        console.log("Migrations completed successfully.");
      } catch (err) {
        console.error("Migration error:", err);
      } finally {
        await db.close();
      }
    }
  }

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Server running: http://localhost:${config.port}`);
  });
};

boot().catch((err) => {
  console.error("Boot failed:", err);
  process.exit(1);
});
