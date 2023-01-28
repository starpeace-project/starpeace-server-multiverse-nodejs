
export default class Translation {
  german: string;
  english: string;
  spanish: string;
  french: string;
  italian: string;
  portuguese: string;

  constructor (german: string, english: string, spanish: string, french: string, italian: string, portuguese: string) {
    this.german = german;
    this.english = english;
    this.spanish = spanish;
    this.french = french;
    this.italian = italian;
    this.portuguese = portuguese;
  }

  toJson (): any {
    return {
      DE: this.german,
      EN: this.english,
      ES: this.spanish,
      FR: this.french,
      IT: this.italian,
      PT: this.portuguese
    };
  }

  static fromJson (json: any): Translation {
    return new Translation(
      json.DE,
      json.EN,
      json.ES,
      json.FR,
      json.IT,
      json.PT
    );
  }
}
