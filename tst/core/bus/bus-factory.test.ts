import { test } from 'vitest';

import { DateTime } from 'luxon';
import { gzipSync } from 'fflate';

import SimulationPayload from '../../../src/core/bus/events/simulation-payload';
import Utils from '../../../src/utils/utils';

test('BusFactory simulation event', () => {

  const companyCount = 8;
  const withCorporation = true;
  const withBuilding = true;


  const companiesJson: Array<any> = [];
  for (let i = 0; i < companyCount; i++) {
    companiesJson.push({
      id: Utils.uuid(),
      cashflow: Math.random() * 100000
    });
  }

  const cashflowJson: any = {
    lastMailAt: DateTime.fromISO('2500-01-01T00:00:00'),
    cash: 10000000000,
    cashflow: 1000000,
    companies: companiesJson.length ? companiesJson : undefined
  };

  const payload = {
    planet: {
      time: DateTime.fromISO('2500-01-01T00:00:00'),
      season: 'summer'
    },
    corporation: withCorporation ? cashflowJson : undefined,
    selectedBuilding: withBuilding ? {
      id: Utils.uuid(),
      constructionProgress: (1 / 3),
      cashflow: 100000
    } : undefined,
    buildingEvents: undefined,
    issuedVisas: undefined
  };

  const size = Buffer.byteLength(JSON.stringify(payload));
  console.log("Payload size (bytes):", size);
  console.log("MB per Hour:", Math.round(((size * 2 * 60 * 60) / (1024 * 1024)) * 100) / 100);

  const data = Buffer.from(JSON.stringify(payload));
  const gzipped = gzipSync(data);
  console.log("Compressed Payload size (bytes):", gzipped.length);
  console.log("MB per Hour:", Math.round(((gzipped.length * 2 * 60 * 60) / (1024 * 1024)) * 100) / 100);

  const data2 = Buffer.from(JSON.stringify(new SimulationPayload(payload).toJson()));
  const gzipped2 = gzipSync(data2);
  console.log("Minified compressed Payload size (bytes):", gzipped2.length);
  console.log("MB per Hour:", Math.round(((gzipped2.length * 2 * 60 * 60) / (1024 * 1024)) * 100) / 100);
});
