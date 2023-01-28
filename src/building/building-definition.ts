import Translation from '../language/translation';

export default class BuildingDefinition {
  id: string;
  imageId: string;
  constructionImageId: string;

  concreteFoundation: boolean;
  name: Translation;

  industryCategoryId: string;
  industryTypeId: string;
  sealId: string;

  restricted: boolean;
  cityZoneId: string;

  requiredInventionIds: Array<string>;
  allowedInventionIds: Array<string>;


  constructor (id: string, imageId: string, constructionImageId: string, concreteFoundation: boolean, name: Translation, industryCategoryId: string, industryTypeId: string, sealId: string, restricted: boolean, cityZoneId: string, requiredInventionIds: Array<string>, allowedInventionIds: Array<string>) {
    this.id = id;
    this.imageId = imageId;
    this.constructionImageId = constructionImageId;
    this.concreteFoundation = concreteFoundation;
    this.name = name;
    this.industryCategoryId = industryCategoryId;
    this.industryTypeId = industryTypeId;
    this.sealId = sealId;
    this.restricted = restricted;
    this.cityZoneId = cityZoneId;
    this.requiredInventionIds = requiredInventionIds;
    this.allowedInventionIds = allowedInventionIds;
  }

  toJson (): any {
    return {
      id: this.id,
      imageId: this.imageId,
      constructionImageId: this.constructionImageId,
      concreteFoundation: this.concreteFoundation,
      name: this.name.toJson(),
      industryCategoryId: this.industryCategoryId,
      industryTypeId: this.industryTypeId,
      sealId: this.sealId,
      restricted: this.restricted,
      cityZoneId: this.cityZoneId,
      requiredInventionIds: this.requiredInventionIds,
      allowedInventionIds: this.allowedInventionIds
    };
  }

  static fromJson (json: any): BuildingDefinition {
    return new BuildingDefinition(
      json.id,
      json.imageId,
      json.constructionImageId,
      json.concreteFoundation ?? false,
      Translation.fromJson(json.name),
      json.industryCategoryId,
      json.industryTypeId,
      json.sealId,
      (json.restricted ?? false) || (!json.cityZoneId),
      json.cityZoneId,
      json.requiredInventionIds ?? [],
      json.allowedInventionIds ?? []
    );
  }
}
