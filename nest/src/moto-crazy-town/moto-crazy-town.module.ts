import {Module} from '@nestjs/common';
import {ProductModule} from '../product/product.module';
import {LogModule} from '../log/log.module';
import {MotoCrazyTownController} from './controller/moto-crazy-town.controller';
import {MotoCrazyTownScrapper} from './scrapper/moto-crazy-town.scrapper';

@Module({
    imports: [
        ProductModule,
        LogModule,
    ],
    controllers: [
        MotoCrazyTownController
    ],
    providers: [
        MotoCrazyTownScrapper
    ]
})
export class MotoCrazyTownModule {

}
