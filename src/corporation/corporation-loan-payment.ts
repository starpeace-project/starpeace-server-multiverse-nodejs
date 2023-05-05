import { DateTime } from "luxon";

export default class CorporationLoanPayment {
  id: string;
  bankerType: string;
  createdAt: DateTime;
  nextPaymentAt: DateTime;
  nextPaymentAmount: number;
  principleBalance: number;
  termYears: number;
  interestRate: number;

  constructor (id: string, bankerType: string, createdAt: DateTime, nextPaymentAt: DateTime, nextPaymentAmount: number, principleBalance: number, termYears: number, interestRate: number) {
    this.id = id;
    this.bankerType = bankerType;
    this.createdAt = createdAt;
    this.nextPaymentAt = nextPaymentAt;
    this.nextPaymentAmount = nextPaymentAmount;
    this.principleBalance = principleBalance;
    this.termYears = termYears;
    this.interestRate = interestRate;
  }

  get maturityAt (): DateTime {
    return this.createdAt.plus({ years: this.termYears });
  }

  get interestRatePercent (): number {
    return this.interestRate * 100;
  }

  toJson (): any {
    return {
      id: this.id,
      bankerType: this.bankerType,
      createdAt: this.createdAt.toISO(),
      nextPaymentAt: this.nextPaymentAt.toISO(),
      nextPaymentAmount: this.nextPaymentAmount,
      principleBalance: this.principleBalance,
      termYears: this.termYears,
      interestRate: this.interestRate
    };
  }

  static fromJson (json: any): CorporationLoanPayment {
    return new CorporationLoanPayment(
      json.id,
      json.bankerType,
      DateTime.fromISO(json.createdAt),
      DateTime.fromISO(json.nextPaymentAt),
      json.nextPaymentAmount,
      json.principleBalance,
      json.termYears,
      json.interestRate
    );
  }
}
