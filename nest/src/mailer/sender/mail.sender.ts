import { Injectable } from '@nestjs/common';
import { environment } from '../../environment';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailSender {
  public async sendEmail(emailsTo: string[], subject: string, text: string) {
    const smtpTransport = nodemailer.createTransport({
      host: environment.smtpConfig.host,
      port: environment.smtpConfig.port,
      secure: environment.smtpConfig.secure,
      auth: {
        user: environment.smtpConfig.username,
        pass: environment.smtpConfig.password,
      },
    });

    for (let i = 0; i < emailsTo.length; i++) {
      const mailOptions = {
        from: environment.emailFrom,
        to: emailsTo[i],
        subject: subject,
        generateTextFromHTML: true,
        html: text,
      };
      try {
        await smtpTransport.sendMail(mailOptions);
      } catch (e) {
        console.log(e);
      }
      smtpTransport.close();
    }
  }
}
