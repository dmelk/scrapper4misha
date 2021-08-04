import {Injectable} from '@nestjs/common';
import {DinamotoScrapper} from '../scrapper/dinamoto.scrapper';
import {MailSender} from '../../mailer/sender/mail.sender';
import {Cron} from '@nestjs/schedule';
import {environment} from '../../environment';

@Injectable()
export class DinamotoScheduler {

    constructor(
        private readonly scrapper: DinamotoScrapper,
        private readonly mailSender: MailSender,
    ) {
    }

    @Cron('0 1 * * 1')
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
