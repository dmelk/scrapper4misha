import { Module } from '@nestjs/common';
import {ScheduleModule} from '@nestjs/schedule';
import {ScrapperModule} from "./scrapper/scrapper.module";

@Module({
  imports: [
      ScheduleModule.forRoot(),
      ScrapperModule,
  ],
})
export class AppModule {}
