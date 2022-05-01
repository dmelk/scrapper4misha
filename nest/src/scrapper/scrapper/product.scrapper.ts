import {Injectable} from '@nestjs/common';
import {LogStore} from '../../log/store/log.store';
import {ScrapperStatus} from "../../log/type/scrapper.status";
import {MotodomScrapper} from "../../motodom/scrapper/motodom.scrapper";
import {DinamotoScrapper} from "../../dinamoto/scrapper/dinamoto.scrapper";
import {ExcelGenerator} from "../../product/generator/excel.generator";
import {MotoCrazyTownScrapper} from "../../moto-crazy-town/scrapper/moto-crazy-town.scrapper";

@Injectable()
export class ProductScrapper {
    public static readonly BASE_NAME = 'product';

    constructor(
        private readonly logStore: LogStore,
        private readonly excelGenerator: ExcelGenerator,
        private readonly dinamotoScrapper: DinamotoScrapper,
        private readonly motodomScrapper: MotodomScrapper,
        private readonly motoCrazyTownScrapper: MotoCrazyTownScrapper,
    ) {
    }

    public async startScrapping(): Promise<string> {
        await this.logStore.storeLog(
            {
                status: ScrapperStatus.IN_PROGRESS,
                started: (new Date()).toISOString(),
                processed: 0
            },
            ProductScrapper.BASE_NAME
        );

        const workbook = this.excelGenerator.createWorkbook(),
            productSheet = this.excelGenerator.createProductSheet(workbook);

        // this.excelGenerator.createGroupsSheet(workbook);

        let productRow = 2;
        productRow = await this.dinamotoScrapper.startScrapping(productRow, productSheet);
        productRow = await this.motodomScrapper.startScrapping(productRow, productSheet);
        await this.motoCrazyTownScrapper.startScrapping(productRow, productSheet);

        const xlsName = this.excelGenerator.saveWorkbook(workbook, ProductScrapper.BASE_NAME);
        await this.logStore.storeLog(
            {
                finished: (new Date()).toISOString(),
                status: ScrapperStatus.COMPLETED,
                path: xlsName,
            },
            ProductScrapper.BASE_NAME
        );

        return xlsName;
    }
}
