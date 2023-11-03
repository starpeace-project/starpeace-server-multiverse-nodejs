import ModelEventClient from '../core/events/model-event-client.js';
import Utils from '../utils/utils.js';

import Company from '../company/company.js';

export function asCompanyDao (client: ModelEventClient, planetId: string): CompanyDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    all () { return client.allCompanies(planetId); },
    set: Utils.PROMISE_NOOP_ANY
  }
}

export default interface CompanyDao {
  close (): Promise<void>;
  all (): Promise<Company[]>;
  set (building: Company): Promise<Company>;
}
