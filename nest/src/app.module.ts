import { Module } from '@nestjs/common';
import {DinamotoModule} from './dinamoto/dinamoto.module';
import {MotoCrazyTownModule} from './moto-crazy-town/moto-crazy-town.module';

@Module({
  imports: [
      DinamotoModule,
      MotoCrazyTownModule,
  ],
})
export class AppModule {}
