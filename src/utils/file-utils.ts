import _ from 'lodash';
import fs from 'fs';
import path from 'path';

export default class FileUtils {

  static readAllFilesSync (dir: string, fileMatcher: (file: string) => boolean | null): Array<string> {
    return fs.readdirSync(dir).reduce((files: any, file: string) => {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
        return files.concat(FileUtils.readAllFilesSync(path.join(dir, file), fileMatcher));
      }
      else {
        return files.concat(!fileMatcher || fileMatcher(file) ? [path.join(dir, file)] : []);
      }
    }, []);
  }

  static parseToJson (rootDir: string, allowlistPatterns: Array<string>, blocklistPatterns: Array<string>): any {
    return _.flatten(_.map(FileUtils.readAllFilesSync(rootDir, (filePath) => {
      for (let pattern of blocklistPatterns) {
        if (filePath.endsWith(pattern)) {
          return false;
        }
      }
      for (let pattern of allowlistPatterns) {
        if (!filePath.endsWith(pattern)) {
          return false;
        }
      }
      return true;
    }), (path: string) => JSON.parse(fs.readFileSync(path).toString())));
  }

}
