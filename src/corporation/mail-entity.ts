
export default class MailEntity {
  id: string;
  name: string;

  constructor (id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  toJson (): any {
    return {
      id: this.id,
      name: this.name
    };
  }

  static fromJson (json: any): MailEntity {
    return new MailEntity(
      json.id,
      json.name
    );
  }
}
