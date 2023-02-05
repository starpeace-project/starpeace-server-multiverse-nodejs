import _ from 'lodash';
import { DateTime } from 'luxon';

import MailEntity from '../corporation/mail-entity';


export default class Mail {
  id: string;
  corporationId: string;

  read: boolean;
  sentAt: DateTime;
  planetSentAt: DateTime;

  from: MailEntity;
  to: MailEntity[];

  subject: string;
  body: string;

  constructor (id: string, corporationId: string, read: boolean, sentAt: DateTime, planetSentAt: DateTime, from: MailEntity, to: MailEntity[], subject: string, body: string) {
    this.id = id;
    this.corporationId = corporationId;
    this.read = read;
    this.sentAt = sentAt;
    this.planetSentAt = planetSentAt;
    this.from = from;
    this.to = to;
    this.subject = subject;
    this.body = body;
  }

  markRead (): Mail {
    this.read = true;
    return this;
  }

  toJson (): any {
    return {
      id: this.id,
      corporationId: this.corporationId,
      read: this.read,
      sentAt: this.sentAt.toISO(),
      planetSentAt: this.planetSentAt.toISODate(),
      from: this.from.toJson(),
      to: this.to.map(t => t.toJson()),
      subject: this.subject,
      body: this.body
    };
  }

  static fromJson (json: any): Mail {
    return new Mail(
      json.id,
      json.corporationId,
      json.read,
      DateTime.fromISO(json.sentAt),
      DateTime.fromISO(json.planetSentAt),
      MailEntity.fromJson(json.from),
      (json.to ?? []).map(MailEntity.fromJson),
      json.subject,
      json.body
    );
  }
}
