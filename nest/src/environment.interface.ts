interface GoogleConfigInterface {
    username: string;
    password: string;
}

export interface EnvironmentInterface {
    googleConfig: GoogleConfigInterface;
    emailFrom: string;
    emailsTo: string[];
    webPath: string;
}
