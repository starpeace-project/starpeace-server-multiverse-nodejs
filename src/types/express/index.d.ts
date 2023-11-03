import { PlanetMetadata } from '../../core/galaxy-manager.js';
import TycoonVisa from '../../tycoon/tycoon-visa.js';

declare module 'express-serve-static-core' {
  interface Request {
    planet: PlanetMetadata | null;
    visa: TycoonVisa | null;
  }
}