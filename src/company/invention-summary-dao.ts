import ModelEventClient from '../core/events/model-event-client.js';
import Utils from '../utils/utils.js';

import InventionSummary from './invention-summary.js';

export function asInventionSummaryDao (client: ModelEventClient, planetId: string): InventionSummaryDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    forCompanyId (id: string) { return client.getCompanyInventionSummary(planetId, id); },
    set: Utils.PROMISE_NOOP_ANY
  }
}

export default interface InventionSummaryDao {
  close (): Promise<void>;

  forCompanyId (id: string): Promise<InventionSummary>;
  set (summary: InventionSummary): Promise<InventionSummary>;
}
