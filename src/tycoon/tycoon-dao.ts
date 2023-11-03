import ModelEventClient from '../core/events/model-event-client.js';
import Utils from '../utils/utils.js';

import Tycoon from './tycoon.js';

export function asTycoonDao (client: ModelEventClient): TycoonDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    all () { return client.allTycoons(); },
    set: Utils.PROMISE_NOOP_ANY
  }
}

export default interface TycoonDao {
  close (): Promise<void>;

  all (): Promise<Tycoon[]>;
  set (tycoon: Tycoon): Promise<Tycoon>;
}
