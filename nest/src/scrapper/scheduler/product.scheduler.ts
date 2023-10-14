import { Injectable } from '@nestjs/common';
import { MailSender } from '../../mailer/sender/mail.sender';
import { Cron } from '@nestjs/schedule';
import { environment } from '../../environment';
import { ProductScrapper } from '../scrapper/product.scrapper';

@Injectable()
export class ProductScheduler {
  constructor(
    private readonly scrapper: ProductScrapper,
    private readonly mailSender: MailSender,
  ) {}

  @Cron('0 1 * * 1')
  public async handleCron() {
    const xlsName = await this.scrapper.startScrapping();

    await this.mailSender.sendEmail(
      environment.emailsTo,
      'Products finished',
      `
            <p>
                <a href="${environment.webPath}api/xls/${xlsName}">
                    Products xls file is here.
                </a>
            </p>
            `,
    );
  }
}
