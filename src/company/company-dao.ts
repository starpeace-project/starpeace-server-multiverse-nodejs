import ModelEventClient from '../core/events/model-event-client';
import Utils from '../utils/utils';

import Company from '../company/company';

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
