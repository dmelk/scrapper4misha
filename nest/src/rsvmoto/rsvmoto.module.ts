import { Module } from '@nestjs/common';
import { LogModule } from '../log/log.module';
import { ProductModule } from '../product/product.module';
import { RsvmotoScrapper } from './scrapper/rsvmoto.scrapper';

@Module({
  imports: [LogModule, ProductModule],
  controllers: [],
  providers: [RsvmotoScrapper],
  exports: [RsvmotoScrapper],
})
export class RsvmotoModule {}
