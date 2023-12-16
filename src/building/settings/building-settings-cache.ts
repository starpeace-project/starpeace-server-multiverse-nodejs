import BuildingSettings from './building-settings.js';
import BuildingSettingsDao from './building-settings-dao.js';

import Utils from '../../utils/utils.js';

export default class BuildingSettingsCache {
  dao: BuildingSettingsDao;

  loaded: boolean = false;
  dirtyBuildingIds: Set<string> = new Set();

  settingsByBuildingId: Record<string, BuildingSettings> = {};

  constructor (dao: BuildingSettingsDao) {
    this.dao = dao;
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  async flush (): Promise<void> {
    const flushedIds: string[] = await Promise.all(Array.from(this.dirtyBuildingIds).map(id => {
      if (this.settingsByBuildingId[id]) {
        this.dao.set(this.settingsByBuildingId[id] as BuildingSettings);
      }
      else {
        this.dao.remove(id);
      }
      return id;
    }));
    for (const id of flushedIds) {
      this.dirtyBuildingIds.delete(id);
    }
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (const settings of (await this.dao.all())) {
        this.settingsByBuildingId[settings.buildingId] = settings;
      }
      this.loaded = true;
    });
  }

  remove (buildingId: string): void {
    if (this.settingsByBuildingId[buildingId]) {
      delete this.settingsByBuildingId[buildingId];
      this.dirtyBuildingIds.add(buildingId);
    }
  }

  all (): BuildingSettings[] {
    return Object.values(this.settingsByBuildingId);
  }

  forBuildingId (buildingId: string): BuildingSettings | undefined {
    return this.settingsByBuildingId[buildingId];
  }

  update (settingOrSettings: BuildingSettings | BuildingSettings[]): void {
    if (Array.isArray(settingOrSettings)) {
      for (const settings of settingOrSettings) {
        this.update(settings);
      }
    }
    else {
      this.settingsByBuildingId[settingOrSettings.buildingId] = settingOrSettings;
      this.dirtyBuildingIds.add(settingOrSettings.buildingId);
    }
  }
}
