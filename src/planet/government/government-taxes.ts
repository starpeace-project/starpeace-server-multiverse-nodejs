
export class Tax {
  industryCategoryId: string;
  industryTypeId: string;
  taxRate: number;
  lastYear: number;

  constructor (industryCategoryId: string, industryTypeId: string, taxRate: number, lastYear: number) {
    this.industryCategoryId = industryCategoryId;
    this.industryTypeId = industryTypeId;
    this.taxRate = taxRate;
    this.lastYear = lastYear;
  }

  toJson (): any {
    return {
      industryCategoryId: this.industryCategoryId,
      industryTypeId: this.industryTypeId,
      taxRate: this.taxRate,
      lastYear: this.lastYear
    }
  }

  static fromJson (json: any): Tax {
    return new Tax(
      json.industryCategoryId,
      json.industryTypeId,
      json.taxRate ?? 0,
      json.lastYear ?? 0
    );
  }
}

export default class GovernmentTaxes {
  townId: string;
  taxes: Array<Tax>;

  constructor (townId: string, taxes: Array<Tax>) {
    this.townId = townId;
    this.taxes = taxes;
  }

  toJson (): any {
    return {
      townId: this.townId,
      taxes: this.taxes.map(t => t.toJson())
    }
  }

  static fromJson (json: any): GovernmentTaxes {
    return new GovernmentTaxes(
      json.townId,
      (json.taxes ?? []).map(Tax.fromJson)
    );
  }
}