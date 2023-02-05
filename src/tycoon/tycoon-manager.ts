import { hash, compare } from 'bcrypt';
import Filter from 'bad-words';

import ModelEventClient from '../core/events/model-event-client';

import Tycoon from '../tycoon/tycoon';
import TycoonCache from '../tycoon/tycoon-cache';

import Utils from '../utils/utils';


export default class TycoonManager {
  modelClient: ModelEventClient;
  cache: TycoonCache;

  constructor (modelClient: ModelEventClient, tycoonCache: TycoonCache) {
    this.modelClient = modelClient;
    this.cache = tycoonCache;
  }

  create (username: string, password: string): Promise<Tycoon> {
    return new Promise<Tycoon>((resolve: (value: Tycoon) => void, reject: (value: any) => void) => {
      if (!username?.length || !password?.length || new Filter().isProfane(username)) return reject('INVALID_NAME');
      const existingTycoon: Tycoon | null = this.forUsername(username);
      if (existingTycoon) {
        return reject('USERNAME_CONFLICT');
      }
      else {
        hash(password, 10, (err: Error | undefined, hash: string) => {
          if (err) return reject(err);
          this.modelClient.createTycoon(new Tycoon(Utils.uuid(), username, username, hash))
            .then(resolve)
            .catch(reject)
        });
      }
    });
  }

  all (): Tycoon[] { return this.cache.all(); }
  forId (tycoonId: string): Tycoon | null { return this.cache.forId(tycoonId); }
  forUsername (username: string): Tycoon | null { return this.cache.forUsername(username); }

  forUsernamePassword (username: string, password: string): Promise<Tycoon | null> {
    return new Promise((resolve: (value: Tycoon | null) => void, reject: (value: any) => void) => {
      const user: Tycoon | null = this.forUsername(username);
      if (!user) {
        return resolve(null);
      }
      else {
        compare(password, user.passwordHash || '')
          .then((res) => resolve(res ? user : null))
          .catch(reject);
      }
    });
  }
}

