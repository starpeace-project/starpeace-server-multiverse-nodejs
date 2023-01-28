import ModelEventClient from '../core/events/model-event-client';
import Utils from '../utils/utils';

import Invention from './invention';

export function asInventionDao (client: ModelEventClient, planetId: string): InventionDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    forCompanyId (id: string) { return client.listCompanyInventions(planetId, id); }
  }
}

export default interface InventionDao {
  close (): Promise<void>;

  forCompanyId (id: string): Promise<Invention[]>;
}
