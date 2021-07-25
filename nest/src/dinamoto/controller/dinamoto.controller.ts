import {Controller, Post} from '@nestjs/common';
import {DinamotoScrapper} from '../scrapper/dinamoto.scrapper';

@Controller('/api/dinamoto')
export class DinamotoController {
    constructor(
        private readonly scrapper: DinamotoScrapper
    ) {
    }

    @Post()
    public start() {
        this.scrapper.startScrapping();
        return {
            success: true
        };
    }
}
