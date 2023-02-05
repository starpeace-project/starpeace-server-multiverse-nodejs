import winston from 'winston';
import 'winston-daily-rotate-file';

import SimulationEventPublisher from '../core/events/simulation-event-publisher';

import Planet from '../planet/planet';
import PlanetCache from '../planet/planet-cache';


const FRAME_DURATION_MS = 500;


class SimulationFrame {
  planet: Planet;

  constructor (planet: Planet) {
    this.planet = planet;
  }
}

export default class Simulation {
  logger: winston.Logger;
  simulationLogger: winston.Logger;
  eventPublisher: SimulationEventPublisher;

  planetId: string;
  planetCache: PlanetCache;

  running: boolean = false;

  constructor (logger: winston.Logger, eventPublisher: SimulationEventPublisher, planetId: string, planetCache: PlanetCache) {
    this.logger = logger;
    this.eventPublisher = eventPublisher;
    this.planetId = planetId;
    this.planetCache = planetCache;

    this.simulationLogger = winston.createLogger({
      transports: [new winston.transports.DailyRotateFile({
        level: 'info',
        filename: 'logs/simulation-%DATE%.log',
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d'
      })],
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
      )
    });
  }

  currentMs (): number {
    const hrTime = process.hrtime();
    return hrTime[0] * 1000 + hrTime[1] / 1000000;
  }

  start (): void {
    this.running = true;
    this.mainLoop();
  }

  stop (): void {
    this.logger.info('Stopping engine...');
    this.running = false;
  }

  mainLoop (): void {
    if (!this.running) {
      this.logger.info('Engine stopped');
      return;
    }

    if (!this.planetCache.loaded) {
      setTimeout(() => this.mainLoop(), 1000);
      return;
    }

    const startMs = this.currentMs();
    const frame: SimulationFrame = this.simulate();
    const endMs = this.currentMs();

    const durationMs = Math.round(endMs - startMs);
    const toWait = durationMs > FRAME_DURATION_MS ? 0 : Math.max(0, (FRAME_DURATION_MS - durationMs));

    if (frame) this.eventPublisher.sendEvent(this.planetId, frame.planet);
    setTimeout(() => this.mainLoop(), toWait);
  }

  simulate (): SimulationFrame {
    const planet: Planet = this.planetCache.planet;
    planet.time = planet.time.plus({ hour: 1 });

    this.simulationLogger.info("Planet time: %s", planet.time.toISO({ suppressSeconds: true, suppressMilliseconds: true, includeOffset: false }));



    this.planetCache.update(planet);

    return new SimulationFrame(planet);
  }

}
