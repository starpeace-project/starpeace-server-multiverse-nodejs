
import assert from 'assert';

import { BuildingImageDefinition } from '@starpeace/starpeace-assets-types';
import SetupTowns from '../../src/setup/setup-towns';


const configurations = {
  building: {
    definitions: {},
    simulations: {},
    images: {}
  },
  industry: {
    cityZones: [],
    industryCategories: [],
    industryTypes: [],
    levels: [],
    resourceTypes: [],
    resourceUnits: []
  },
  inventions: [],
  seals: []
};

const townhallImage = new BuildingImageDefinition('id', 'path', 3, 3, [], [], null);
const buildingImage = new BuildingImageDefinition('id', 'path', 2, 2, [], [], null);

describe('SetupTowns', () => {
  describe('#planBuilding()', () => {
    it('should plan building layout at same position', () => {
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(0, townhallImage, 0, buildingImage), [0, -3]);
      assert.deepEqual(new SetupTowns(configurations, 1).planBuilding(0, townhallImage, 0, buildingImage), [-3, 0]);

      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(1, townhallImage, 1, buildingImage), [0, -3]);
      assert.deepEqual(new SetupTowns(configurations, 1).planBuilding(1, townhallImage, 1, buildingImage), [2, 0]);

      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(2, townhallImage, 2, buildingImage), [0, 2]);
      assert.deepEqual(new SetupTowns(configurations, 1).planBuilding(2, townhallImage, 2, buildingImage), [2, 0]);

      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(3, townhallImage, 3, buildingImage), [0, 2]);
      assert.deepEqual(new SetupTowns(configurations, 1).planBuilding(3, townhallImage, 3, buildingImage), [-3, 0]);
    });

    it('should plan building layout at different x and same y position', () => {
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(0, townhallImage, 1, buildingImage), [3, 0]);
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(1, townhallImage, 0, buildingImage), [-4, 0]);

      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(3, townhallImage, 2, buildingImage), [3, 0]);
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(2, townhallImage, 3, buildingImage), [-4, 0]);
    });

    it('should plan building layout at same x and different y position', () => {
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(0, townhallImage, 3, buildingImage), [0, 3]);
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(3, townhallImage, 0, buildingImage), [0, -4]);

      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(1, townhallImage, 2, buildingImage), [0, 3]);
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(2, townhallImage, 1, buildingImage), [0, -4]);
    });

    it('should plan building layout at different x and different y position', () => {
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(0, townhallImage, 2, buildingImage), [3, 3]);
      assert.deepEqual(new SetupTowns(configurations, 0).planBuilding(2, townhallImage, 0, buildingImage), [-4, -4]);
    });
  });
});
