import { Module } from '@nestjs/common';
import { LogModule } from '../log/log.module';
import { ProductModule } from '../product/product.module';
import { MotodomScrapper } from './scrapper/motodom.scrapper';

@Module({
  imports: [LogModule, ProductModule],
  controllers: [],
  providers: [MotodomScrapper],
  exports: [MotodomScrapper],
})
export class MotodomModule {}
