import { PlanetMetadata } from '../../core/galaxy-manager';
import TycoonVisa from '../../tycoon/tycoon-visa';

declare module 'express-serve-static-core' {
  interface Request {
    planet: PlanetMetadata | null;
    visa: TycoonVisa | null;
  }
}