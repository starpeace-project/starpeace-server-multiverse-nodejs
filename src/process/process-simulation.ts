'use strict';

import ModelEventClient from '../core/events/model-event-client';
import SimulationEventPublisher from '../core/events/simulation-event-publisher';

import Simulation from '../engine/simulation';

import PlanetCache from '../planet/planet-cache';
import { asPlanetDao } from '../planet/planet-dao';


const planetIndex = parseInt(process.argv[3]);
const planetId = process.argv[2];


const modelEventClient = new ModelEventClient();
const planetCache = new PlanetCache(asPlanetDao(modelEventClient, planetId));

const eventPublisher = new SimulationEventPublisher(planetIndex);
const simulation = new Simulation(eventPublisher, planetId, planetCache);

process.on('SIGINT', async () => {
  try {
    modelEventClient.stop();
    eventPublisher.stop();
    simulation.stop();
    await Promise.all([planetCache.close()]); //, actorCache.close()
  }
  catch (err) {
    console.log('[Simulation] Unable to shutdown cleanly: ' + err);
  }
  process.exit();
});

const loadData = async () => {
  modelEventClient.start();
  await planetCache.load();
  // await actorCache.load();
};

loadData()
  .then(() => eventPublisher.start())
  .then(() => simulation.start())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
