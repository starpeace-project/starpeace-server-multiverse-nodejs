
export default class TycoonSocketCache {
  socketIdByTycoonId: Record<string, string>;
  tycoonIdBySocketId: Record<string, string>;

  constructor () {
    this.socketIdByTycoonId = {};
    this.tycoonIdBySocketId = {};
  }

  forId (tycoonId: string): string | null { return this.socketIdByTycoonId[tycoonId]; }
  forSocketId (socketId: string): string | null { return this.tycoonIdBySocketId[socketId]; }

  set (tycoonId: string, socketId: string) {
    if (this.socketIdByTycoonId[tycoonId]) {
      console.warn("Account already has socket");
      this.clearBySocketId(this.socketIdByTycoonId[tycoonId]);
    }

    this.socketIdByTycoonId[tycoonId] = socketId;
    this.tycoonIdBySocketId[socketId] = tycoonId;
  }

  clearBySocketId (socketId: string) {
    const tycoonId = this.tycoonIdBySocketId[socketId];
    if (tycoonId) {
      delete this.tycoonIdBySocketId[socketId];
      const otherSocketId: string | null = this.socketIdByTycoonId[tycoonId];
      if (otherSocketId && otherSocketId === socketId) {
        delete this.socketIdByTycoonId[tycoonId];
      }
    }
  }

}
