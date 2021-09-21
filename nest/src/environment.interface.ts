interface SmotpConfigInterface {
    username: string;
    password: string;
    host: string;
    port: number;
    secure: boolean;
}

export interface EnvironmentInterface {
    smtpConfig: SmotpConfigInterface;
    emailFrom: string;
    emailsTo: string[];
    webPath: string;
}
