interface GoogleConfigInterface {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    user: string;
}

export interface EnvironmentInterface {
    googleConfig: GoogleConfigInterface;
    emailFrom: string;
    emailsTo: string[];
    webPath: string;
}
