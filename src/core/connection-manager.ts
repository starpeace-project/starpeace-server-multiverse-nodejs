import { Socket as netSocket } from 'net';
import { Server, Socket as ioSocket } from 'socket.io';
import winston from 'winston';

export class ConnectionInformation {
  disconnectableSocketIds: Array<string> = [];
  connectedSocketsByTycoonIds: Record<string, ioSocket> = {};
}

export class ConnectionState {
  running: boolean = false;

  openConnectionsByRemoteKey: Record<string, netSocket> = {};
  tycoonIdsByOpenSocketId: Record<string, string> = {};

  handleConnection (connection: netSocket): void {
    if (!this.running) {
      connection.destroy();
      return;
    }

    const key = "#{connection.remoteAddress}:#{connection.remotePort}";
    this.openConnectionsByRemoteKey[key] = connection;
    connection.on('close', () => delete this.openConnectionsByRemoteKey[key]);
  }

  connectSocket (tycoonId: string, socketId: string): void {
    this.tycoonIdsByOpenSocketId[socketId] = tycoonId;
  }

  disconnectSocket (socketId: string): void {
    if (this.tycoonIdsByOpenSocketId[socketId]) {
      delete this.tycoonIdsByOpenSocketId[socketId];
    }
  }
}

export default class ConnectionManager {
  logger: winston.Logger
  state: ConnectionState;
  io: Server;

  constructor (logger: winston.Logger, io: Server) {
    this.logger = logger;
    this.state = new ConnectionState();
    this.io = io;
  }

  start () {
    this.state.running = true;
  }

  stop () {
    this.state.running = false;

    for (const [socketId, socket] of Object.entries(this.io.sockets.sockets)) {
      this.logger.info(`[HTTP Worker] Disconnecting socket ${socketId}`);
      socket.disconnect(true);
    }

    for (const [key, connection] of Object.entries(this.state.openConnectionsByRemoteKey)) {
      this.logger.info(`[HTTP Worker] Destroying connection from ${key}`);
      connection.destroy();
    }
  }

  handleConnection (connection: netSocket): void {
    if (!this.state.running) {
      connection.destroy();
      return;
    }

    const key = "#{connection.remoteAddress}:#{connection.remotePort}";
    this.state.openConnectionsByRemoteKey[key] = connection;
    connection.on('close', () => delete this.state.openConnectionsByRemoteKey[key]);
  }

  connectSocket (socketId: string, accountId: string): void {
    this.state.tycoonIdsByOpenSocketId[socketId] = accountId;
  }

  disconnectSocket (socketId: string): void {
    const socket: ioSocket | undefined = this.io.sockets.sockets.get(socketId);
    if (socket) {
      this.logger.info(`[HTTP Worker] Forcefully disconnecting socket ${socketId}`);
      socket.disconnect(true);
    }

    if (this.state.tycoonIdsByOpenSocketId[socketId]) {
      delete this.state.tycoonIdsByOpenSocketId[socketId];
    }
  }

  connectionInformation (): ConnectionInformation {
    const info = new ConnectionInformation();
    for (const [socketId, tycoonId] of Object.entries(this.state.tycoonIdsByOpenSocketId)) {
      const socket: ioSocket | undefined = this.io.sockets.sockets.get(socketId);
      if (!socket) {
        info.disconnectableSocketIds.push(socketId);
        continue;
      }
      info.connectedSocketsByTycoonIds[tycoonId] = socket;
    }
    return info;
  }
}
