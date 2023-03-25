import express from 'express';
import http from 'http';
import Cors from 'cors';
import * as bodyParser from 'body-parser';
import compression from 'compression';
import passport from 'passport';

import winston from 'winston';
import expressWinston from 'express-winston';
import 'winston-daily-rotate-file';

import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';

import BuildingApi from './building-api';
import CompanyApi from './company-api';
import CorporationApi from './corporation-api';
import GalaxyApi from './galaxy-api';
import MetadataApi from './metadata-api';
import PlanetApi from './planet-api';
import TycoonApi from './tycoon-api';

import GalaxyManager from '../galaxy-manager';
import ModelEventClient from '../events/model-event-client';
import { HttpServerCaches } from '../http-server';
import CacheByPlanet from '../../planet/cache-by-planet';

import BuildingCache from '../../building/building-cache';
import CompanyCache from '../../company/company-cache';
import CorporationCache from '../../corporation/corporation-cache';
import InventionSummaryCache from '../../company/invention-summary-cache';
import PlanetCache from '../../planet/planet-cache';
import RankingsCache from '../../corporation/rankings-cache';
import TownCache from '../../planet/town-cache';
import TycoonCache from '../../tycoon/tycoon-cache';
import TycoonManager from '../../tycoon/tycoon-manager';
import TycoonVisaCache from '../../tycoon/tycoon-visa-cache';
import MapCache from '../../planet/map-cache';


const DEFAULT_TIMEOUT_IN_MS = 10 * 1000;

export interface ApiCaches {
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
    ApiFactory.configureRoutes(logger, app, galaxyManager, modelEventClient, caches);

    const server: http.Server = http.createServer(app);
    server.setTimeout(DEFAULT_TIMEOUT_IN_MS);
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
            .then((account: any) => account ? done(null, account) : done(null, false, { message: 'NOT_FOUND' }))
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
          return account ? done(null, account) : done(null, false, { message: 'NOT_FOUND' });
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

    app.get('/metadata/buildings', authenticate, verifyPlanet, verifyVisa, metadataApi.getBuildings());
    app.get('/metadata/core', authenticate, verifyPlanet, verifyVisa, metadataApi.getCore());
    app.get('/metadata/inventions', authenticate, verifyPlanet, verifyVisa, metadataApi.getInventions());

    app.get('/buildings', authenticate, verifyPlanet, verifyVisa, buildingApi.getBuildings());
    app.post('/buildings', authenticate, verifyPlanet, verifyTycoon, buildingApi.createBuilding());
    app.get('/buildings/:buildingId', authenticate, verifyPlanet, verifyVisa, buildingApi.getBuilding());

    app.get('/corporations', authenticate, verifyPlanet, verifyVisa, corporationApi.getPlanetCorporations());
    app.post('/corporations', authenticate, verifyPlanet, verifyTycoon, corporationApi.createCorporation());
    app.get('/corporations/:corporationId', authenticate, verifyPlanet, verifyVisa, corporationApi.getCorporation());
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

    app.get('/tycoons/:tycoonId', authenticate, verifyPlanet, verifyVisa, tycoonApi.getTycoon());
  }

}
