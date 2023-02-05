import winston from 'winston';
import 'winston-daily-rotate-file';

import ModelEventClient from '../core/events/model-event-client';
import SimulationEventPublisher from '../core/events/simulation-event-publisher';

import Simulation from '../engine/simulation';

import PlanetCache from '../planet/planet-cache';
import { asPlanetDao } from '../planet/planet-dao';


const planetIndex = parseInt(process.argv[3]);
const planetId = process.argv[2];

const logger: winston.Logger = winston.createLogger({
  transports: [new winston.transports.DailyRotateFile({
    level: 'info',
    filename: 'logs/process-simulation-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '14d',
    handleRejections: true,
    handleExceptions: true
  }), new winston.transports.Console({
    handleRejections: true,
    handleExceptions: true
  })],
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp(),
    winston.format.label({ label: "Simulation" }),
    winston.format.printf(({ level, message, label, timestamp }) => `${timestamp} [${label}][${level}]: ${message}`)
  ),
  exitOnError: false
});

const modelEventClient = new ModelEventClient(logger);
const planetCache = new PlanetCache(asPlanetDao(modelEventClient, planetId));

const eventPublisher = new SimulationEventPublisher(logger, planetIndex);
const simulation = new Simulation(logger, eventPublisher, planetId, planetCache);

process.on('SIGINT', async () => {
  try {
    modelEventClient.stop();
    eventPublisher.stop();
    simulation.stop();
    await Promise.all([planetCache.close()]); //, actorCache.close()
  }
  catch (err) {
    logger.warn(`Unable to shutdown cleanly: ${err}`);
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
