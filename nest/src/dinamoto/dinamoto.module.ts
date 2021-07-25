import {Module} from '@nestjs/common';
import {LogModule} from '../log/log.module';
import {ProductModule} from '../product/product.module';
import {DinamotoController} from './controller/dinamoto.controller';
import {DinamotoScrapper} from './scrapper/dinamoto.scrapper';

@Module({
    imports: [
        LogModule,
        ProductModule,
    ],
    controllers: [
        DinamotoController,
    ],
    providers: [
        DinamotoScrapper,
    ]
})
export class DinamotoModule {

}
