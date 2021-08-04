import {Module} from '@nestjs/common';
import {LogModule} from '../log/log.module';
import {ProductModule} from '../product/product.module';
import {DinamotoController} from './controller/dinamoto.controller';
import {DinamotoScrapper} from './scrapper/dinamoto.scrapper';
import {MailerModule} from '../mailer/mailer.module';
import {DinamotoScheduler} from './scheduler/dinamoto.scheduler';

@Module({
    imports: [
        LogModule,
        ProductModule,
        MailerModule,
    ],
    controllers: [
        DinamotoController,
    ],
    providers: [
        DinamotoScrapper,
        DinamotoScheduler,
    ]
})
export class DinamotoModule {

}
