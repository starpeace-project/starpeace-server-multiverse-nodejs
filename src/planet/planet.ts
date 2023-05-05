import { DateTime } from "luxon";

export default class Planet {
  time: DateTime;

  constructor (time: DateTime) {
    this.time = time;
  }

  toJson () {
    return {
      time: this.time.toISO()
    };
  }

  get planetTime (): string {
    return <string> this.time.toISO({ suppressSeconds: true, suppressMilliseconds: true, includeOffset: false });
  }

  get season (): string {
    if (this.time.month == 12 || this.time.month == 1 || this.time.month == 2) return 'winter';
    if (this.time.month == 3 || this.time.month == 4 || this.time.month == 5) return 'spring';
    if (this.time.month == 6 || this.time.month == 7 || this.time.month == 8) return 'summer';
    if (this.time.month == 9 || this.time.month == 10 || this.time.month == 11) return 'fall';
    return 'summer';
  }

  static fromJson (json: any): Planet {
    return new Planet(
      DateTime.fromISO(json.time)
    );
  }

}
