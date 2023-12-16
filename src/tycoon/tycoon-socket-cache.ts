
export default class TycoonSocketCache {
  socketIdByTycoonId: Record<string, string>;
  tycoonIdBySocketId: Record<string, string>;

  selectedBuildingIdByTycoonId: Record<string, string>;

  constructor () {
    this.socketIdByTycoonId = {};
    this.tycoonIdBySocketId = {};
    this.selectedBuildingIdByTycoonId = {};
  }

  forId (tycoonId: string): string | undefined {
    return this.socketIdByTycoonId[tycoonId];
  }
  forSocketId (socketId: string): string | undefined {
    return this.tycoonIdBySocketId[socketId];
  }

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
      if (this.selectedBuildingIdByTycoonId[tycoonId]) {
        delete this.selectedBuildingIdByTycoonId[tycoonId];
      }
    }
  }

  selectBuilding (tycoonId: string, buildingId: string | undefined): void {
    if (buildingId) {
      this.selectedBuildingIdByTycoonId[tycoonId] = buildingId;
    }
    else if (this.selectedBuildingIdByTycoonId[tycoonId]) {
      delete this.selectedBuildingIdByTycoonId[tycoonId];
    }
  }

  selectedBuildingIdForTycoonId (tycoonId: string): string | undefined {
    return this.selectedBuildingIdByTycoonId[tycoonId];
  }
}
