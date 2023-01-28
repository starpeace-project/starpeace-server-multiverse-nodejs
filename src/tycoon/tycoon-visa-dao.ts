import ModelEventClient from '../core/events/model-event-client';

import TycoonVisa from './tycoon-visa';

export function asTycoonVisaDao (client: ModelEventClient): TycoonVisaDao {
  return {
    all () { return client.allTycoonVisas(); }
  }
}

export default interface TycoonVisaDao {
  all (): Promise<TycoonVisa[]>;
}
