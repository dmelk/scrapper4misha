import { Module } from '@nestjs/common';
import { LogStore } from './store/log.store';

@Module({
  providers: [LogStore],
  exports: [LogStore],
})
export class LogModule {}
