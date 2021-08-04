import {Module} from '@nestjs/common';
import {ProductModule} from '../product/product.module';
import {LogModule} from '../log/log.module';
import {MotoCrazyTownController} from './controller/moto-crazy-town.controller';
import {MotoCrazyTownScrapper} from './scrapper/moto-crazy-town.scrapper';
import {MailerModule} from '../mailer/mailer.module';
import {MotoCrazyTownScheduler} from './scheduler/moto-crazy-town.scheduler';

@Module({
    imports: [
        ProductModule,
        LogModule,
        MailerModule,
    ],
    controllers: [
        MotoCrazyTownController
    ],
    providers: [
        MotoCrazyTownScrapper,
        MotoCrazyTownScheduler,
    ]
})
export class MotoCrazyTownModule {

}
