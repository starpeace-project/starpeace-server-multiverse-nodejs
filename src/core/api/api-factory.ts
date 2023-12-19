import express from 'express';
import fs from 'fs-extra';
import http from 'http';
import https from 'https';
import Cors from 'cors';
import bodyParser from 'body-parser';
import compression from 'compression';
import passport from 'passport';

import winston from 'winston';
import expressWinston from 'express-winston';
import 'winston-daily-rotate-file';

import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

import BuildingApi from './building-api.js';
import CompanyApi from './company-api.js';
import CorporationApi from './corporation-api.js';
import GalaxyApi from './galaxy-api.js';
import MetadataApi from './metadata-api.js';
import PlanetApi from './planet-api.js';
import TycoonApi from './tycoon-api.js';

import GalaxyManager, { BuildingConfigurations, CoreConfigurations, InventionConfigurations } from '../galaxy-manager.js';
import ModelEventClient from '../events/model-event-client.js';
import { type HttpServerCaches } from '../http-server.js';
import CacheByPlanet from '../../planet/cache-by-planet.js';

import BuildingCache from '../../building/building-cache.js';
import CompanyCache from '../../company/company-cache.js';
import CorporationCache from '../../corporation/corporation-cache.js';
import InventionSummaryCache from '../../company/invention-summary-cache.js';
import PlanetCache from '../../planet/planet-cache.js';
import RankingsCache from '../../corporation/rankings-cache.js';
import TownCache from '../../planet/town-cache.js';
import TycoonCache from '../../tycoon/tycoon-cache.js';
import TycoonManager from '../../tycoon/tycoon-manager.js';
import TycoonVisaCache from '../../tycoon/tycoon-visa-cache.js';
import MapCache from '../../planet/map-cache.js';

const DEFAULT_TIMEOUT_IN_MS = 10 * 1000;

export interface ApiCaches {
  buildingConfigurations: Record<string, BuildingConfigurations>;
  coreConfigurations: Record<string, CoreConfigurations>;
  inventionConfigurations: Record<string, InventionConfigurations>;

  tycoon: TycoonCache;
  tycoonVisa: TycoonVisaCache;

  building: CacheByPlanet<BuildingCache>;
  company: CacheByPlanet<CompanyCache>;
  corporation: CacheByPlanet<CorporationCache>;
  inventionSummary: CacheByPlanet<InventionSummaryCache>;
  map: CacheByPlanet<MapCache>;
  planet: CacheByPlanet<PlanetCache>;
  rankings: CacheByPlanet<RankingsCache>;
  town: CacheByPlanet<TownCache>;
}

export default class ApiFactory {

  static create (logger: winston.Logger, galaxyManager: GalaxyManager, modelEventClient: ModelEventClient, caches: HttpServerCaches): http.Server {
    ApiFactory.configureAuthentication(galaxyManager, new TycoonManager(modelEventClient, caches.tycoon));

    const app = express();
    app.use(Cors({
      origin: [/localhost\:11010/, 'https://client.starpeace.io'],
      //preflightContinue: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH' , 'DELETE', 'OPTIONS'],
      credentials: true
    }));
    app.use(compression());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(expressWinston.logger({
      transports: [new winston.transports.DailyRotateFile({
        level: 'info',
        filename: 'logs/access-%DATE%.log',
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d'
      })],
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
      ),
      msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms {{req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress}}",
      meta: false,
      metaField: null,
      expressFormat: false
    }));
    app.use(passport.initialize());
    app.use((req, res, next) => {
      req.setTimeout(DEFAULT_TIMEOUT_IN_MS, () => {
        res.sendStatus(500);
        req.socket.end();
      });
      next();
    });
    ApiFactory.configureRoutes(logger, app, galaxyManager, modelEventClient, caches);

    if (galaxyManager.galaxyMetadata.settings?.privateKeyPath && galaxyManager.galaxyMetadata.settings?.certificatePath) {
      if (fs.existsSync(galaxyManager.galaxyMetadata.settings.privateKeyPath) && fs.existsSync(galaxyManager.galaxyMetadata.settings.certificatePath)) {
        logger.info('Attempting to start with SSL and https');
        const server: http.Server = https.createServer({
          key: fs.readFileSync(galaxyManager.galaxyMetadata.settings.privateKeyPath),
          cert: fs.readFileSync(galaxyManager.galaxyMetadata.settings.certificatePath),
        }, app);
        server.setTimeout(DEFAULT_TIMEOUT_IN_MS); // doesn't actually interrupt request
        return server;
      }
      else {
        logger.warn('Unable to find SSL files, starting up with http');
      }
    }

    const server: http.Server = http.createServer(app);
    server.setTimeout(DEFAULT_TIMEOUT_IN_MS); // doesn't actually interrupt request
    return server;
  }

  static configureAuthentication (galaxyManager: GalaxyManager, tycoonManager: TycoonManager): void {
    passport.use(
      'register',
      new LocalStrategy(
        {
          usernameField: 'username',
          passwordField: 'password'
        },
        async (username: string, password: string, done: any) => {
          return tycoonManager.create(username, password)
            .then((user: any) => done(null, user))
            .catch((err: any) => done(err));
        }
      )
    );

    passport.use(
      'login',
      new LocalStrategy(
        {
          usernameField: 'username',
          passwordField: 'password'
        },
        async (username: string, password: string, done: any) => {
          return tycoonManager.forUsernamePassword(username, password)
            .then((account: any) => account && !account.bannedAt ? done(null, account) : done(null, false, { message: 'NOT_FOUND' }))
            .catch((err: any) => done(err));
        }
      )
    );

    passport.use(
      'jwt',
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
          secretOrKey: galaxyManager.secret
        },
        (payload: any, done: any) => {
          if (new Date(payload.exp * 1000) < new Date()) return done(null, false);
          const account = tycoonManager.forId(payload.id);
          return account && !account.bannedAt ? done(null, account) : done(null, false, { message: 'NOT_FOUND' });
        }
      )
    );
  }

  static configureRoutes (logger: winston.Logger, app: express.Express, galaxyManager: GalaxyManager, modelEventClient: ModelEventClient, caches: HttpServerCaches): void {
    const authenticate = (req: express.Request, res: express.Response, next: any): any => {
      return passport.authenticate('jwt', { session: false }, (err: Error, user: any) => {
        if (err || !user) return next();
        return req.logIn(user, { session: false }, (err: Error) => err ? next(err) : next());
      })(req, res, next);
    };

    const buildingApi = new BuildingApi(logger, galaxyManager, modelEventClient, caches);
    const companyApi = new CompanyApi(logger, galaxyManager, modelEventClient, caches);
    const corporationApi = new CorporationApi(logger, galaxyManager, modelEventClient, caches);
    const galaxyApi = new GalaxyApi(logger, galaxyManager, modelEventClient, caches);
    const metadataApi = new MetadataApi(logger, galaxyManager);
    const planetApi = new PlanetApi(logger, galaxyManager, modelEventClient, caches);
    const tycoonApi = new TycoonApi(logger, galaxyManager, modelEventClient, caches);

    const verifyPlanet = planetApi.verifyPlanet();
    const verifyTycoon = planetApi.verifyVisa(true);
    const verifyVisa = planetApi.verifyVisa(false);

    // galaxy API's (account server)
    app.get('/galaxy/metadata', authenticate, galaxyApi.getMetadata());
    app.post('/galaxy/create', galaxyApi.create());
    app.post('/galaxy/login', galaxyApi.login());
    app.post('/galaxy/logout', authenticate, galaxyApi.logout());

    // planet API's (simulation server)
    app.post('/visa', authenticate, verifyPlanet, planetApi.registerVisa());

    app.get('/tycoons/:tycoonId', authenticate, verifyPlanet, verifyVisa, tycoonApi.getTycoon());
    app.get('/tycoons/:tycoonId/corporation-ids', authenticate, tycoonApi.getTycoonCorporations());

    app.get('/metadata/buildings', authenticate, verifyPlanet, verifyVisa, metadataApi.getBuildings());
    app.get('/metadata/core', authenticate, verifyPlanet, verifyVisa, metadataApi.getCore());
    app.get('/metadata/inventions', authenticate, verifyPlanet, verifyVisa, metadataApi.getInventions());

    app.get('/buildings', authenticate, verifyPlanet, verifyVisa, buildingApi.getBuildings());
    app.post('/buildings', authenticate, verifyPlanet, verifyTycoon, buildingApi.createBuilding());
    app.get('/buildings/:buildingId', authenticate, verifyPlanet, verifyVisa, buildingApi.getBuilding());
    app.get('/buildings/:buildingId/details', authenticate, verifyPlanet, verifyVisa, buildingApi.getBuildingDetails());
    app.patch('/buildings/:buildingId/details', authenticate, verifyPlanet, verifyTycoon, buildingApi.setBuildingDetails());
    app.post('/buildings/:buildingId/demolish', authenticate, verifyPlanet, verifyTycoon, buildingApi.demolishBuilding());
    app.post('/buildings/:buildingId/clone', authenticate, verifyPlanet, verifyTycoon, buildingApi.cloneBuilding());
    app.get('/buildings/:buildingId/connections', authenticate, verifyPlanet, verifyVisa, buildingApi.getBuildingConnections());

    app.get('/corporations', authenticate, verifyPlanet, verifyVisa, corporationApi.getPlanetCorporations());
    app.post('/corporations', authenticate, verifyPlanet, verifyTycoon, corporationApi.createCorporation());
    app.get('/corporations/:corporationId', authenticate, verifyPlanet, verifyVisa, corporationApi.getCorporation());
    app.get('/corporations/:corporationId/rankings', authenticate, verifyPlanet, verifyVisa, corporationApi.getRankings());
    app.get('/corporations/:corporationId/prestige-history', authenticate, verifyPlanet, verifyVisa, corporationApi.getPrestigeHistory());
    app.get('/corporations/:corporationId/strategies', authenticate, verifyPlanet, verifyTycoon, corporationApi.getStrategies());
    app.get('/corporations/:corporationId/loan-payments', authenticate, verifyPlanet, verifyTycoon, corporationApi.getLoanPayments());
    app.get('/corporations/:corporationId/loan-offers', authenticate, verifyPlanet, verifyTycoon, corporationApi.getLoanOffers());
    app.get('/corporations/:corporationId/bookmarks', authenticate, verifyPlanet, verifyTycoon, corporationApi.getBookmarks());
    app.post('/corporations/:corporationId/bookmarks', authenticate, verifyPlanet, verifyTycoon, corporationApi.createBookmark());
    app.patch('/corporations/:corporationId/bookmarks', authenticate, verifyPlanet, verifyTycoon, corporationApi.updateBookmarks());
    app.get('/corporations/:corporationId/mail', authenticate, verifyPlanet, verifyTycoon, corporationApi.getMail());
    app.post('/corporations/:corporationId/mail', authenticate, verifyPlanet, verifyTycoon, corporationApi.sendMail());
    app.put('/corporations/:corporationId/mail/:mailId/mark-read', authenticate, verifyPlanet, verifyTycoon, corporationApi.markMailRead());
    app.delete('/corporations/:corporationId/mail/:mailId', authenticate, verifyPlanet, verifyTycoon, corporationApi.deleteMail());

    app.post('/companies', authenticate, verifyPlanet, verifyTycoon, companyApi.createCompany());
    app.get('/companies/:companyId', authenticate, verifyPlanet, verifyVisa, companyApi.getCompany());
    app.get('/companies/:companyId/buildings', authenticate, verifyPlanet, verifyVisa, buildingApi.getCompanyBuildings());
    app.get('/companies/:companyId/inventions', authenticate, verifyPlanet, verifyTycoon, companyApi.getInventions());
    app.put('/companies/:companyId/inventions/:inventionId', authenticate, verifyPlanet, verifyTycoon, companyApi.researchInvention());
    app.delete('/companies/:companyId/inventions/:inventionId', authenticate, verifyPlanet, verifyTycoon, companyApi.sellInvention());

    app.get('/details', authenticate, verifyPlanet, verifyVisa, planetApi.getPlanetDetails());
    app.get('/online', authenticate, verifyPlanet, verifyVisa, planetApi.getOnline());
    app.get('/overlay/:typeId', authenticate, verifyPlanet, verifyVisa, planetApi.getOverlay());
    app.get('/rankings/:rankingTypeId', authenticate, verifyPlanet, verifyVisa, planetApi.getRankings());
    app.get('/roads', authenticate, verifyPlanet, verifyVisa, planetApi.getRoads());

    app.get('/search/corporations', authenticate, verifyPlanet, verifyVisa, corporationApi.getSearch());
    app.get('/search/tycoons', authenticate, verifyPlanet, verifyVisa, tycoonApi.getSearch());

    app.get('/towns', authenticate, verifyPlanet, verifyVisa, planetApi.getTowns());
    app.get('/towns/:townId/buildings', authenticate, verifyPlanet, verifyVisa, buildingApi.getTownBuildings());
    app.get('/towns/:townId/companies', authenticate, verifyPlanet, verifyVisa, companyApi.getTownCompanies());
    app.get('/towns/:townId/details', authenticate, verifyPlanet, verifyVisa, planetApi.getTownDetails());
  }

}
