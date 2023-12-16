import BuildingCache from '../building-cache.js';
import BuildingConnection from './building-connection.js';
import BuildingConnectionStore from './building-connection-store.js';
import Utils from '../../utils/utils.js';

export default class BuildingConnectionCache {
  dao: BuildingConnectionStore;
  buildingCache: BuildingCache;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, BuildingConnection> = {};

  idsBySinkBuildingId: Record<string, Set<string>> = {};
  idsBySourceBuildingId: Record<string, Set<string>> = {};
  idsBySinkBuildingIdResourceId: Record<string, Record<string, Set<string>>> = {};
  idsBySourceBuildingIdResourceId: Record<string, Record<string, Set<string>>> = {};

  constructor (dao: BuildingConnectionStore, buildingCache: BuildingCache) {
    this.dao = dao;
    this.buildingCache = buildingCache;
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirtyIds.size) {
        return resolve();
      }

      Promise.all(Array.from(this.dirtyIds).map(id => {
        return this.dao.set(this.byId[id]);
      }))
        .then((connections: BuildingConnection[]) => {
          for (const connection of connections) {
            this.dirtyIds.delete(connection.id);
          }
        })
        .then(resolve)
        .catch(reject);
    });
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      // FIXME: TODO: need to load faster
      for (const building of this.buildingCache.all()) {
        for (const connection of await this.dao.forSinkBuildingId(building.id)) {
          this.loadConnection(connection);
        }

        for (const connection of await this.dao.forSourceBuildingId(building.id)) {
          this.loadConnection(connection);
        }
      }
      this.loaded = true;
    });
  }

  loadConnection (connection: BuildingConnection): void {
    this.byId[connection.id] = connection;

    this.idsBySinkBuildingId[connection.sinkBuildingId] ||= new Set();
    this.idsBySinkBuildingId[connection.sinkBuildingId].add(connection.id);

    this.idsBySinkBuildingIdResourceId[connection.sinkBuildingId] ||= {};
    this.idsBySinkBuildingIdResourceId[connection.sinkBuildingId][connection.resourceId] ||= new Set();
    this.idsBySinkBuildingIdResourceId[connection.sinkBuildingId][connection.resourceId].add(connection.id);

    this.idsBySourceBuildingId[connection.sourceBuildingId] ||= new Set();
    this.idsBySourceBuildingId[connection.sourceBuildingId].add(connection.id);

    this.idsBySourceBuildingIdResourceId[connection.sourceBuildingId] ||= {};
    this.idsBySourceBuildingIdResourceId[connection.sourceBuildingId][connection.resourceId] ||= new Set();
    this.idsBySourceBuildingIdResourceId[connection.sourceBuildingId][connection.resourceId].add(connection.id);
  }

  forId (connectionId: string): BuildingConnection | undefined {
    return this.byId[connectionId];
  }

  forSinkBuildingId (buildingId: string): Array<BuildingConnection> {
    return Array.from(this.idsBySinkBuildingId[buildingId] ?? []).map((id: string) => this.forId(id)).filter(b => !!b) as BuildingConnection[];
  }
  forSourceBuildingId (buildingId: string): Array<BuildingConnection> {
    return Array.from(this.idsBySourceBuildingId[buildingId] ?? []).map((id: string) => this.forId(id)).filter(b => !!b) as BuildingConnection[];
  }

  forSinkBuildingIdResourceId (buildingId: string, resourceId: string): Array<BuildingConnection> {
    return Array.from(this.idsBySinkBuildingIdResourceId[buildingId]?.[resourceId] ?? []).map((id: string) => this.forId(id)).filter(b => !!b) as BuildingConnection[];
  }
  forSourceBuildingIdResourceId (buildingId: string, resourceId: string): Array<BuildingConnection> {
    return Array.from(this.idsBySourceBuildingIdResourceId[buildingId]?.[resourceId] ?? []).map((id: string) => this.forId(id)).filter(b => !!b) as BuildingConnection[];
  }

  update (connectionOrConnections: BuildingConnection | Array<BuildingConnection>): void {
    if (Array.isArray(connectionOrConnections)) {
      for (const connection of connectionOrConnections) {
        this.update(connection);
      }
    }
    else {
      this.loadConnection(connectionOrConnections);
      this.dirtyIds.add(connectionOrConnections.id);
    }
  }
}
