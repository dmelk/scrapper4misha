import { Module } from '@nestjs/common';
import { LogModule } from '../log/log.module';
import { ProductModule } from '../product/product.module';
import { MailerModule } from '../mailer/mailer.module';
import { ProductController } from './controller/product.controller';
import { ProductScheduler } from './scheduler/product.scheduler';
import { ProductScrapper } from './scrapper/product.scrapper';
import { MotodomModule } from '../motodom/motodom.module';
import { DinamotoModule } from '../dinamoto/dinamoto.module';
import { MotoCrazyTownModule } from '../moto-crazy-town/moto-crazy-town.module';

@Module({
  imports: [
    LogModule,
    ProductModule,
    MailerModule,
    MotodomModule,
    DinamotoModule,
    MotoCrazyTownModule,
  ],
  controllers: [ProductController],
  providers: [ProductScheduler, ProductScrapper],
  exports: [],
})
export class ScrapperModule {}
