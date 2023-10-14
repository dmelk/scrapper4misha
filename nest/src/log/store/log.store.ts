import { Injectable } from '@nestjs/common';
import { LogEntity } from '../entity/log.entity';
import { readFile, writeFile } from 'fs/promises';
import { ScrapperStatus } from '../type/scrapper.status';

@Injectable()
export class LogStore {
  private static readonly STORE_PATH = '/var/www/public/api/';

  private static readonly EXTENSION = '.json';

  public async storeLog(newLog: LogEntity, name: string) {
    const filePath = LogStore.STORE_PATH.concat(name, LogStore.EXTENSION);

    let logEntity: LogEntity = {
      finished: '',
      path: '',
      started: '',
      status: ScrapperStatus.EMPTY,
      processed: 0,
    };

    try {
      const buffer = await readFile(filePath);
      logEntity = JSON.parse(buffer.toString());
    } catch (e) {
      // console.log('read file', e);
    }

    for (const key in newLog) {
      logEntity[key] = newLog[key];
    }

    try {
      await writeFile(filePath, JSON.stringify(logEntity));
    } catch (e) {
      // console.log('write file', e);
    }
  }
}
