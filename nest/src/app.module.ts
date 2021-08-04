import { Module } from '@nestjs/common';
import {DinamotoModule} from './dinamoto/dinamoto.module';
import {MotoCrazyTownModule} from './moto-crazy-town/moto-crazy-town.module';
import {MotodomModule} from './motodom/motodom.module';
import {ScheduleModule} from '@nestjs/schedule';

@Module({
  imports: [
      ScheduleModule.forRoot(),
      DinamotoModule,
      MotoCrazyTownModule,
      MotodomModule,
  ],
})
export class AppModule {}
