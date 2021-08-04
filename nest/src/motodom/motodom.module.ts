import {Module} from '@nestjs/common';
import {LogModule} from '../log/log.module';
import {ProductModule} from '../product/product.module';
import {MotodomController} from './controller/motodom.controller';
import {MotodomScrapper} from './scrapper/motodom.scrapper';
import {MailerModule} from '../mailer/mailer.module';
import {MotodomScheduler} from './scheduler/motodom.scheduler';

@Module({
    imports: [
        LogModule,
        ProductModule,
        MailerModule,
    ],
    controllers: [
        MotodomController,
    ],
    providers: [
        MotodomScrapper,
        MotodomScheduler,
    ],
})
export class MotodomModule {

}
