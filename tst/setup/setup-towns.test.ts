import { expect, test } from 'vitest';

import { BuildingImageDefinition } from '@starpeace/starpeace-assets-types';

import SetupTowns from '../../src/setup/setup-towns.js';


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

test('SetupTowns #planBuilding() should plan building layout at same position', () => {
  expect(SetupTowns.planBuilding(0, 0, townhallImage, 0, buildingImage)).toStrictEqual([0, -3]);
  expect(SetupTowns.planBuilding(1, 0, townhallImage, 0, buildingImage)).toStrictEqual([-3, 0]);

  expect(SetupTowns.planBuilding(0, 1, townhallImage, 1, buildingImage)).toStrictEqual([0, -3]);
  expect(SetupTowns.planBuilding(1, 1, townhallImage, 1, buildingImage)).toStrictEqual([2, 0]);

  expect(SetupTowns.planBuilding(0, 2, townhallImage, 2, buildingImage)).toStrictEqual([0, 2]);
  expect(SetupTowns.planBuilding(1, 2, townhallImage, 2, buildingImage)).toStrictEqual([2, 0]);

  expect(SetupTowns.planBuilding(0, 3, townhallImage, 3, buildingImage)).toStrictEqual([0, 2]);
  expect(SetupTowns.planBuilding(1, 3, townhallImage, 3, buildingImage)).toStrictEqual([-3, 0]);
});

test('SetupTowns #planBuilding() should plan building layout at different x and same y position', () => {
  expect(SetupTowns.planBuilding(0, 0, townhallImage, 1, buildingImage)).toStrictEqual([3, 0]);
  expect(SetupTowns.planBuilding(0, 1, townhallImage, 0, buildingImage)).toStrictEqual([-4, 0]);

  expect(SetupTowns.planBuilding(0, 3, townhallImage, 2, buildingImage)).toStrictEqual([3, 0]);
  expect(SetupTowns.planBuilding(0, 2, townhallImage, 3, buildingImage)).toStrictEqual([-4, 0]);
});

test('SetupTowns #planBuilding() should plan building layout at same x and different y position', () => {
  expect(SetupTowns.planBuilding(0, 0, townhallImage, 3, buildingImage)).toStrictEqual([0, 3]);
  expect(SetupTowns.planBuilding(0, 3, townhallImage, 0, buildingImage)).toStrictEqual([0, -4]);

  expect(SetupTowns.planBuilding(0, 1, townhallImage, 2, buildingImage)).toStrictEqual([0, 3]);
  expect(SetupTowns.planBuilding(0, 2, townhallImage, 1, buildingImage)).toStrictEqual([0, -4]);
});

test('SetupTowns #planBuilding() should plan building layout at different x and different y position', () => {
  expect(SetupTowns.planBuilding(0, 0, townhallImage, 2, buildingImage)).toStrictEqual([3, 3]);
  expect(SetupTowns.planBuilding(0, 2, townhallImage, 0, buildingImage)).toStrictEqual([-4, -4]);
});
