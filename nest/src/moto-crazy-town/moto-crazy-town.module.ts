import {Module} from '@nestjs/common';
import {ProductModule} from '../product/product.module';
import {LogModule} from '../log/log.module';
import {MotoCrazyTownScrapper} from './scrapper/moto-crazy-town.scrapper';

@Module({
    imports: [
        ProductModule,
        LogModule,
    ],
    controllers: [
    ],
    providers: [
        MotoCrazyTownScrapper,
    ],
    exports: [
        MotoCrazyTownScrapper
    ]
})
export class MotoCrazyTownModule {

}
