import bmp from 'bmp-js';
import fs from 'fs-extra';

import { type PlanetMetadata } from '../core/galaxy-manager.js';

import Town from '../planet/town.js';
import Utils from '../utils/utils.js';
import TownCache from './town-cache.js';

export default class MapCache {
  planetMetadata: PlanetMetadata;
  townCache: TownCache;

  loaded: boolean = false;

  terrainData: Uint32Array = new Uint32Array(0);
  townData: Uint32Array = new Uint32Array(0);

  constructor (planetMetadata: PlanetMetadata, townCache: TownCache) {
    this.planetMetadata = planetMetadata;
    this.townCache = townCache;
  }

  async close (): Promise<void> {
    // nothing to do
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      const terrainData: Uint8Array = bmp.decode(fs.readFileSync(`./galaxy/${this.planetMetadata.id}/terrain.bmp`)).data;
      const townDecoded = bmp.decode(fs.readFileSync(`./galaxy/${this.planetMetadata.id}/towns.bmp`));
      const townData: Uint8Array = townDecoded.data;

      this.terrainData = new Uint32Array(this.planetMetadata.planetHeight * this.planetMetadata.planetWidth);
      this.townData = new Uint32Array(this.planetMetadata.planetHeight * this.planetMetadata.planetWidth);

      for (let y = 0; y < this.planetMetadata.planetHeight; y++) {
        for (let x = 0; x < this.planetMetadata.planetWidth; x++) {
          const sourceIndex = (y * this.planetMetadata.planetWidth + x) * 4;
          const targetIndex = (this.planetMetadata.planetHeight - y - 1) * this.planetMetadata.planetWidth + (this.planetMetadata.planetWidth - x - 1);

          this.terrainData[targetIndex] = (terrainData[sourceIndex + 3] << 16) | (terrainData[sourceIndex + 2] << 8) | (terrainData[sourceIndex + 1]);
          this.townData[targetIndex] = (townData[sourceIndex + 3] << 16) | (townData[sourceIndex + 2] << 8) | (townData[sourceIndex + 1]);
        }
      }

      this.loaded = true;
    });
  }

  findTown (mapX: number, mapY: number): Town | null {
    return this.townCache.forColor(this.townData[mapY * this.planetMetadata.planetWidth + mapX]);
  }
}
