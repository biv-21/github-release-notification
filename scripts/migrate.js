const { runner } = require("node-pg-migrate");
const { database } = require("../src/config");

const runMigrations = async () => {
  const direction = process.argv[2];

  try {
    console.log(`Running migrations ...`);
    await runner({
      direction,
      dir: "migrations",
      migrationsTable: "migrations",
      databaseUrl: {
        host: database.host,
        port: database.port,
        user: database.user,
        password: database.password,
        database: database.database,
      },
    });

    console.log("Migrations completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigrations();
