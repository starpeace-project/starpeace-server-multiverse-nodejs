import cluster from 'cluster';

import ProcessManager from './process/process-manager.js';
import HttpServer from './core/http-server.js';

if (cluster.isPrimary) {
  const manager: ProcessManager = new ProcessManager();
  manager.start();

  process.on('SIGINT', () => manager.stop());
  process.stdin.resume();
}
else {
  const server = new HttpServer();
  server.start();

  process.on('SIGINT', async () => await server.stop());
}
