import { DateTime } from 'luxon';

export default class Invention {
  id: string;
  companyId: string;
  status: string;
  progress: number;
  investment: number;
  rebate: number;
  rebatePaid: number;
  createdAt: DateTime;

  constructor (id: string, companyId: string, status: string, progress: number, investment: number, rebate: number, rebatePaid: number, createdAt: DateTime) {
    this.id = id;
    this.companyId = companyId;
    this.status = status;
    this.progress = progress;
    this.investment = investment;
    this.rebate = rebate;
    this.rebatePaid = rebatePaid;
    this.createdAt = createdAt;
  }

  toJson (): any {
    return {
      id: this.id,
      companyId: this.companyId,
      status: this.status,
      progress: this.progress,
      investment: this.investment,
      rebate: this.rebate,
      rebatePaid: this.rebatePaid,
      createdAt: this.createdAt.toISO()
    };
  }

  static fromJson (json: any): Invention {
    return new Invention(
      json.id,
      json.companyId,
      json.status,
      json.progress,
      json.investment,
      json.rebate,
      json.rebatePaid,
      DateTime.fromISO(json.createdAt),
    );
  }
}
