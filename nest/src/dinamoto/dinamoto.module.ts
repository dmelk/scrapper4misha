import {Module} from '@nestjs/common';
import {LogModule} from '../log/log.module';
import {ProductModule} from '../product/product.module';
import {DinamotoScrapper} from './scrapper/dinamoto.scrapper';

@Module({
    imports: [
        LogModule,
        ProductModule,
    ],
    controllers: [
    ],
    providers: [
        DinamotoScrapper,
    ],
    exports: [
        DinamotoScrapper
    ]
})
export class DinamotoModule {

}
