
export default class CorporationLoanOffer {
  id: string;
  bankerType: string;
  maxAmount: number;
  maxTermYears: number;
  interestRate: number;

  constructor (id: string, bankerType: string, maxAmount: number, maxTermYears: number, interestRate: number) {
    this.id = id;
    this.bankerType = bankerType;
    this.maxAmount = maxAmount;
    this.maxTermYears = maxTermYears;
    this.interestRate = interestRate;
  }

  get interestRatePercent (): number {
    return this.interestRate * 100;
  }

  toJson (): any {
    return {
      id: this.id,
      bankerType: this.bankerType,
      maxAmount: this.maxAmount,
      maxTermYears: this.maxTermYears,
      interestRate: this.interestRate
    };
  }

  static fromJson (json: any): CorporationLoanOffer {
    return new CorporationLoanOffer(
      json.id,
      json.bankerType,
      json.maxAmount,
      json.maxTermYears,
      json.interestRate
    );
  }
}
