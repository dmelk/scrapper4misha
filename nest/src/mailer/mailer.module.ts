import {Module} from '@nestjs/common';
import {MailSender} from './sender/mail.sender';

@Module({
    imports: [],
    providers: [
        MailSender,
    ],
    exports: [
        MailSender,
    ],
})
export class MailerModule {

}
