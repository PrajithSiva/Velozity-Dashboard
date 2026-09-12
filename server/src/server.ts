import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSocketServer } from "./sockets/socket.server";
import { scheduleOverdueJob } from "./jobs/overdue.job";

const app = createApp();
const httpServer = http.createServer(app);

initSocketServer(httpServer);
scheduleOverdueJob();

httpServer.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Velozity API listening on port ${env.port} [${env.nodeEnv}]`);
});
