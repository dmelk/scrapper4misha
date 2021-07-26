import {Controller, Post} from '@nestjs/common';
import {MotoCrazyTownScrapper} from '../scrapper/moto-crazy-town.scrapper';

@Controller('/api/motocrazytown')
export class MotoCrazyTownController {
    constructor(
        private readonly scrapper: MotoCrazyTownScrapper
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
