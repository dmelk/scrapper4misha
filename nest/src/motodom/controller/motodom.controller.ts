import {Controller, Post} from '@nestjs/common';
import {MotodomScrapper} from '../scrapper/motodom.scrapper';

@Controller('/api/motodom')
export class MotodomController {
    constructor(
        private readonly scrapper: MotodomScrapper
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
