import {Module} from '@nestjs/common';
import {CombinationGenerator} from './generator/combination.generator';
import {ExcelGenerator} from './generator/excel.generator';

@Module({
    imports: [],
    providers: [
        CombinationGenerator,
        ExcelGenerator,
    ],
    exports: [
        ExcelGenerator
    ]
})
export class ProductModule {

}
