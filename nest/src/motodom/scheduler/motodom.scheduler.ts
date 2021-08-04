import {Injectable} from '@nestjs/common';
import {MailSender} from '../../mailer/sender/mail.sender';
import {Cron} from '@nestjs/schedule';
import {environment} from '../../environment';
import {MotodomScrapper} from '../scrapper/motodom.scrapper';

@Injectable()
export class MotodomScheduler {

    constructor(
        private readonly scrapper: MotodomScrapper,
        private readonly mailSender: MailSender,
    ) {
    }

    @Cron('0 3 * * 1')
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
