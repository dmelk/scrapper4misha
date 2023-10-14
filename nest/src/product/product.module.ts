import { Module } from '@nestjs/common';
import { CombinationGenerator } from './generator/combination.generator';
import { ExcelGenerator } from './generator/excel.generator';

@Module({
  imports: [],
  providers: [ExcelGenerator, CombinationGenerator],
  exports: [ExcelGenerator, CombinationGenerator],
})
export class ProductModule {}
