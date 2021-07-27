import {Module} from '@nestjs/common';
import {LogModule} from '../log/log.module';
import {ProductModule} from '../product/product.module';
import {MotodomController} from './controller/motodom.controller';
import {MotodomScrapper} from './scrapper/motodom.scrapper';

@Module({
    imports: [
        LogModule,
        ProductModule,
    ],
    controllers: [
        MotodomController,
    ],
    providers: [
        MotodomScrapper,
    ],
})
export class MotodomModule {

}
