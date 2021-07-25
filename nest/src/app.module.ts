import { Module } from '@nestjs/common';
import {DinamotoModule} from './dinamoto/dinamoto.module';

@Module({
  imports: [
      DinamotoModule
  ],
})
export class AppModule {}
