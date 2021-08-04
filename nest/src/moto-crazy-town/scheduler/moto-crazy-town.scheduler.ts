import {Injectable} from '@nestjs/common';
import {MailSender} from '../../mailer/sender/mail.sender';
import {Cron} from '@nestjs/schedule';
import {environment} from '../../environment';
import {MotoCrazyTownScrapper} from '../scrapper/moto-crazy-town.scrapper';

@Injectable()
export class MotoCrazyTownScheduler {

    constructor(
        private readonly scrapper: MotoCrazyTownScrapper,
        private readonly mailSender: MailSender,
    ) {
    }

    @Cron('0 2 * * 1')
    public async handleCron() {
        const xlsName = await this.scrapper.startScrapping();

        await this.mailSender.sendEmail(
            environment.emailsTo,
            'Dinamoto finished',
            `
            <p>
                <a href="${environment.webPath}api/xls/${xlsName}">
                    Dinamoto xls file is here.
                </a>
            </p>
            `
        );

    }
}
