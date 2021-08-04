import {Injectable} from '@nestjs/common';
import {environment} from '../../environment';
import {google} from 'googleapis';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailSender {

    private readonly oauth2Client;

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            environment.googleConfig.clientId,
            environment.googleConfig.clientSecret,
            'https://developers.google.com/oauthplayground'
        );
        this.oauth2Client.setCredentials({
            refresh_token: environment.googleConfig.refreshToken
        });
    }

    public async sendEmail(emailsTo: string[], subject: string, text: string) {
        const accessTokenResponse = await this.oauth2Client.getAccessToken();
        if (!accessTokenResponse.token) {
            throw new Error('Google auth failed')
        }
        const accessToken = accessTokenResponse.token,
            smtpTransport = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    type: "OAuth2",
                    user: environment.googleConfig.user,
                    clientId: environment.googleConfig.clientId,
                    clientSecret: environment.googleConfig.clientSecret,
                    refreshToken: environment.googleConfig.refreshToken,
                    accessToken: accessToken
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
