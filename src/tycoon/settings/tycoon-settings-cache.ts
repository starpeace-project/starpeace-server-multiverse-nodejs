import TycoonSettings from './tycoon-settings.js';
import TycoonSettingsStore from './tycoon-settings-store.js';
import Utils from '../../utils/utils.js';

export default class TycoonSettingsCache {
  dao: TycoonSettingsStore;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byTycoonId: Record<string, TycoonSettings> = {};

  constructor (dao: TycoonSettingsStore) {
    this.dao = dao;
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (let settings of await this.dao.all()) {
        this.byTycoonId[settings.tycoonId] = settings;
      }
      this.loaded = true;
    });
  }

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirtyIds.size) {
        return resolve();
      }

      Promise.all(Array.from(this.dirtyIds).map(id => this.dao.set(this.byTycoonId[id])))
        .then((allSettings: TycoonSettings[]) => {
          for (const settings of allSettings) {
            this.dirtyIds.delete(settings.tycoonId);
          }
        })
        .then(resolve)
        .catch(reject);
    });
  }

  forTycoonId (tycoonId: string): TycoonSettings | undefined {
    return this.byTycoonId[tycoonId];
  }

  update (settingOrSettings: TycoonSettings | Array<TycoonSettings>): void {
    if (Array.isArray(settingOrSettings)) {
      for (const setting of settingOrSettings) {
        this.update(setting);
      }
    }
    else {
      this.byTycoonId[settingOrSettings.tycoonId] = settingOrSettings;
      this.dirtyIds.add(settingOrSettings.tycoonId);
    }
  }

}
