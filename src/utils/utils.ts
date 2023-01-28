import { v4 as uuidv4 } from 'uuid';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export default class Utils {
  static PROMISE_NOOP_VOID: () => Promise<void> = () => new Promise(resolve => resolve());
  static PROMISE_NOOP_ANY: (value: any) => Promise<any> = (value: any) => new Promise(resolve => resolve(value));

  static randomInt (min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomString (len: number): string {
    const buffer = [];
    for (let i = 0; i < len; i++) {
      buffer.push(CHARS[Utils.randomInt(0, CHARS.length - 1)]);
    }
    return buffer.join('');
  }

  static uuid (): string {
    return uuidv4();
  }

  static sleep (ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static withRetries (retries: number, functionBody: () => Promise<void>): Promise<void> {
    return new Promise(async (resolve, reject) => {
      for (let index = 0; index < retries; index++) {
        try {
          await functionBody();
          return resolve();
        }
        catch (err) {
          console.error(err);
          Utils.sleep(500);
        }
      }
      return reject();
    });
  }

  static between (lhs: number, rhs: number): number {
    return lhs + Math.random() * (rhs - lhs);
  }

}

