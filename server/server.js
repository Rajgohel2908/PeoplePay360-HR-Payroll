// server/server.js
const app = require('./app');
const { runMigrations } = require('./database/migrations');
const { seedDatabase } = require('./database/seeders');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('Initializing PEOPLEPAY360 database...');
    await runMigrations();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  PEOPLEPAY360 Enterprise API Engine Running!      `);
      console.log(`  Port: ${PORT}                                    `);
      console.log(`  Health: http://localhost:${PORT}/api/health       `);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal server boot error:', err);
    process.exit(1);
  }
}

startServer();
