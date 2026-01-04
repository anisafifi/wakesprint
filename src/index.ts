import { app } from './api.js';
import { logger } from './logger.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Wake-on-LAN API server started on http://localhost:${PORT}`);
  console.log(`🚀 Wake-on-LAN API server running on http://localhost:${PORT}`);
  console.log(`📋 API Endpoints:`);
  console.log(`   GET    /health`);
  console.log(`   GET    /api/devices`);
  console.log(`   GET    /api/devices/:name`);
  console.log(`   POST   /api/devices`);
  console.log(`   PUT    /api/devices/:name`);
  console.log(`   DELETE /api/devices/:name`);
  console.log(`   GET    /api/wake?device=<name> OR ?mac=<address>&broadcast=<address>`);
  console.log(`   POST   /api/wake/:name`);
  console.log(`   POST   /api/wake`);
  console.log(`   POST   /api/wake-all`);
  console.log(`   POST   /api/wake-multiple`);
  console.log(`\n📚 Swagger Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`📝 Logs: ./logs/combined.log and ./logs/error.log`);
});
