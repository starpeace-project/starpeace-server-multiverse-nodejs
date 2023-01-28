import cluster from 'cluster';

import ProcessManager from './process/process-manager';
import HttpServer from './core/http-server';

//setInterval((-> console.log("[Memory Usage] #{Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100} MB")), 5000)

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
