import {Injectable} from '@nestjs/common';
import {environment} from '../../environment';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailSender {

    constructor() {
    }

    public async sendEmail(emailsTo: string[], subject: string, text: string) {
        const smtpTransport = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: environment.googleConfig.username,
                    pass: environment.googleConfig.password,
                },
            });

        for (let i = 0; i < emailsTo.length; i++) {
            const mailOptions = {
                from: environment.emailFrom,
                to: emailsTo[i],
                subject: subject,
                generateTextFromHTML: true,
                html: text
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
