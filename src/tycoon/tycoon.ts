import { DateTime } from "luxon";

export interface TycoonParameters {
  id: string;
  username: string;
  name: string;
  passwordHash: string;

  admin?: boolean | undefined;
  gameMaster?: boolean | undefined;

  bannedAt?: DateTime | undefined;
  bannedBy?: string | undefined;
  bannedReason?: string | undefined;
}

export default class Tycoon {
  id: string;
  username: string;
  name: string;
  passwordHash: string;

  admin: boolean;
  gameMaster: boolean;

  bannedAt: DateTime | undefined;
  bannedBy: string | undefined;
  bannedReason: string | undefined;

  constructor (parameters: TycoonParameters) {
    this.id = parameters.id;
    this.username = parameters.username;
    this.name = parameters.name;
    this.passwordHash = parameters.passwordHash;
    this.admin = parameters.admin ?? false;
    this.gameMaster = parameters.gameMaster ?? false;
    this.bannedAt = parameters.bannedAt;
    this.bannedBy = parameters.bannedBy;
    this.bannedReason = parameters.bannedReason;
  }

  get isPriviledged (): boolean {
    return this.admin || this.gameMaster;
  }

  toJson () {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      passwordHash: this.passwordHash,
      admin: this.admin,
      gameMaster: this.gameMaster,
      bannedAt: this.bannedAt,
      bannedBy: this.bannedBy,
      bannedReason: this.bannedReason
    };
  }

  static isPrivileged (user: Express.User | undefined): boolean {
    return !!user && ((user as Tycoon).admin || (user as Tycoon).gameMaster);
  }

  static fromJson (json: any): Tycoon {
    return new Tycoon({
      id: json.id,
      username: json.username,
      name: json.name,
      passwordHash: json.passwordHash,
      admin: json.admin,
      gameMaster: json.gameMaster,
      bannedAt: json.bannedAt,
      bannedBy: json.bannedBy,
      bannedReason: json.bannedReason
    });
  }
}
