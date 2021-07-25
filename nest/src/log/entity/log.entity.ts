import {ScrapperStatusType} from '../type/scrapper.status';

export interface LogEntity {
    status?: ScrapperStatusType;
    started?: string;
    path?: string;
    finished?: string;
    processed?: number;
}
