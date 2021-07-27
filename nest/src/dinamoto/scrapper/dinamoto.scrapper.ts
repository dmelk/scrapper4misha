import {Injectable} from '@nestjs/common';
import {ExcelGenerator} from '../../product/generator/excel.generator';
import {LogStore} from '../../log/store/log.store';
import {ProductAttributesMap} from '../../product/type/product-attributes.map';
import {ProductAttributeInterface} from '../../product/type/product-attribute.interface';
import {ScrapperStatus} from '../../log/type/scrapper.status';
import got from 'got';
import {ProductInfo} from '../../product/type/product.info';
import cheerioModule from 'cheerio';
import {CombinationGenerator} from '../../product/generator/combination.generator';

@Injectable()
export class DinamotoScrapper {
    private static readonly BASE_NAME = 'dinamoto';

    private static readonly BASE_URL = 'http://dinamoto.com.ua/';

    private static readonly CATALOG_URL = 'catalog/';

    private static readonly PAGE_URL = 'page/';

    private static readonly PAGE_STEP = 20;

    private readonly productAttributes: ProductAttributesMap;

    constructor(
        private readonly excelGenerator: ExcelGenerator,
        private readonly logStore: LogStore,
        private readonly combinationGenerator: CombinationGenerator,
    ) {
        this.productAttributes = new Map<string, ProductAttributeInterface>();
        this.productAttributes.set(
            'цвет',
            {
                title: 'Цвет',
                column: 15,
            }
        );
        this.productAttributes.set(
            'размеры',
            {
                title: 'Размер',
                column: 16,
            }
        );
    }

    public async startScrapping() {
        await this.logStore.storeLog(
            {
                status: ScrapperStatus.IN_PROGRESS,
                started: (new Date()).toISOString(),
                processed: 0
            },
            DinamotoScrapper.BASE_NAME
        );

        const workbook = this.excelGenerator.createWorkbook(),
            productSheet = this.excelGenerator.createProductSheet(workbook, this.productAttributes);

        this.excelGenerator.createGroupsSheet(workbook);

        let productRow = 2, maxPage = 0;
        for (let currPage = 0; currPage <= maxPage; currPage += DinamotoScrapper.PAGE_STEP) {
            [maxPage, productRow] = await this.loadCatalogPage(currPage, maxPage, productRow, productSheet);
        }

        const xlsName = this.excelGenerator.saveWorkbook(workbook, DinamotoScrapper.BASE_NAME);
        await this.logStore.storeLog(
            {
                finished: (new Date()).toISOString(),
                status: ScrapperStatus.COMPLETED,
                path: xlsName,
            },
            DinamotoScrapper.BASE_NAME
        );

    }

    private static getPage(href) {
        const matches = Array.from(href.matchAll(/\?p=(.*)/g), m => m[1]);
        return matches[matches.length - 1];
    }

    private async loadCatalogPage(page: number, oldMaxPage: number, productRow: number, productSheet): Promise<[number, number]> {
        let url = DinamotoScrapper.BASE_URL.concat(DinamotoScrapper.CATALOG_URL);
        if (page !== 0) {
            url = url.concat(DinamotoScrapper.PAGE_URL, page.toString());
        }

        const response = await got(url);
        const $ = cheerioModule.load(response.body);

        // get maxPage
        let maxPage = oldMaxPage;
        if (page === 0) {
            const pageLinks = $('div.wrapPaging > a'),
                lastPageHref = pageLinks[pageLinks.length-1].attribs.href;

            maxPage = parseInt(DinamotoScrapper.getPage(lastPageHref));
        }

        const products = $('div.catalog-list > div > ul > li > a');
        for (let i = 0; i < products.length; i++) {
            productRow += await this.loadProduct(products[i].attribs.href, productRow, productSheet);
        }

        await this.logStore.storeLog(
            {
                processed: productRow - 2,
            },
            DinamotoScrapper.BASE_NAME
        );

        return [maxPage, productRow];
    }

    private async loadProduct(url: string, productRow: number, productSheet): Promise<number> {
        const response = await got(url);
        const $ = cheerioModule.load(response.body);

        const productInfo: ProductInfo = {
            link: url,
            currency: 'грн.',
            available: '+',
            name: '',
            manufacturer: '',
            skus: [],
            prices: [],
            description: '',
            descriptionHtml: '',
            unitName: 'шт.',
            discount: '',
            combinations: [],
            photos: [],
        };

        const names = $('h1[property="name"]');
        if (names.length) {
            productInfo.name = names.html();
        }

        const descriptions = $('span[property="description"]');
        if (descriptions.length) {
            productInfo.descriptionHtml = descriptions.html();
            productInfo.description = cheerioModule.text(descriptions);
        }

        const prices = $('meta[property="price"]');
        let productPrice = 0;
        if (prices.length) {
            productPrice = parseFloat(prices[0].attribs.content);
        }

        const variants = [];
        let productSku = '';
        $('div.catalog-item-info-inside > div').each(
            (i, div) => {
                if (i === 0) {
                    // manufacturer
                    productInfo.manufacturer = $('p', div).html();
                    return;
                }
                if (i === 1) {
                    // vendorCode
                    productSku = $('p', div).html();
                    return;
                }
                const variant = {
                    name: '',
                    values: []
                };

                variant.name = $('strong', div).html();
                variant.name = variant.name.toLowerCase();
                $('a', div).each(
                    (j, a) => {
                        if (a.attribs['data-id']) {
                            variant.values.push(
                                cheerioModule.text(a.children)
                            );
                        }
                    }
                );
                if (variant.values.length !== 0) {
                    variants.push(variant);
                }
            }
        )

        if (variants.length === 0) {
            variants.push(
                {
                    name: '',
                    values: [''],
                }
            );
        }

        productInfo.combinations = this.combinationGenerator.build([], variants);
        for (let i = 0; i < productInfo.combinations.length; i++) {
            productInfo.prices.push(productPrice);
            productInfo.skus.push(productSku);
        }

        $('ul.catalog-photos > li > a').each(
            (i, a) => {
                productInfo.photos.push(DinamotoScrapper.BASE_URL.concat(a.attribs.href));
            }
        )

        return this.excelGenerator.addProductToSheet(
            productInfo,
            this.productAttributes,
            productRow,
            productSheet,
        );
    }

}
