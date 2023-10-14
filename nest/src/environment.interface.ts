interface SmtpConfigInterface {
  username: string;
  password: string;
  host: string;
  port: number;
  secure: boolean;
}

export interface EnvironmentInterface {
  smtpConfig: SmtpConfigInterface;
  emailFrom: string;
  emailsTo: string[];
  webPath: string;
}
