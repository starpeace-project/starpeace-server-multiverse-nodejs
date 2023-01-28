

export default class Tycoon {
  id: string;
  username: string;
  name: string;
  passwordHash: string;

  constructor (id: string, username: string, name: string, passwordHash: string) {
    this.id = id;
    this.username = username;
    this.name = name;
    this.passwordHash = passwordHash;
  }

  toJson () {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      passwordHash: this.passwordHash
    };
  }

  static fromJson (json: any): Tycoon {
    return new Tycoon(
      json.id,
      json.username,
      json.name,
      json.passwordHash
    );
  }
}
