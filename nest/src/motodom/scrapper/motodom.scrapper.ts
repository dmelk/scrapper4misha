import {Injectable} from '@nestjs/common';
import {ExcelGenerator} from '../../product/generator/excel.generator';
import {LogStore} from '../../log/store/log.store';
import {ProductAttributesMap} from '../../product/type/product-attributes.map';
import {ProductAttributeInterface} from '../../product/type/product-attribute.interface';
import {ScrapperStatus} from '../../log/type/scrapper.status';
import got from 'got';
import cheerioModule from 'cheerio';
import {ProductInfo} from '../../product/type/product.info';
import {catalogList} from './catalog.list';
import {CombinationGenerator} from '../../product/generator/combination.generator';

@Injectable()
export class MotodomScrapper {
    private static readonly BASE_NAME = 'motodom';

    private static readonly BASE_URL = 'https://motodom.ua/';

    private static readonly PAGE_URL = '?page=';

    private static readonly COMBINATION_URL = 'index.php?route=journal3/price&popup=0';

    private static readonly PAGE_STEP = 1;

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
            'размер',
            {
                title: 'Размер',
                column: 16,
            }
        );
    }

    private static getPage(href) {
        const matches = Array.from(href.matchAll(/\?page=(.*)/g), m => m[1]);
        return matches[matches.length - 1];
    }

    public async startScrapping() {
        await this.logStore.storeLog(
            {
                status: ScrapperStatus.IN_PROGRESS,
                started: (new Date()).toISOString(),
                processed: 0
            },
            MotodomScrapper.BASE_NAME
        );

        const workbook = this.excelGenerator.createWorkbook(),
            productSheet = this.excelGenerator.createProductSheet(workbook, this.productAttributes);

        this.excelGenerator.createGroupsSheet(workbook);

        let productRow = 2;
        for (let i = 0; i < catalogList.length; i++) {
            const catalogPage = catalogList[i];
            let maxPage = 1;
            for (let currPage = 1; currPage <= maxPage; currPage += MotodomScrapper.PAGE_STEP) {
                [maxPage, productRow] = await this.loadCatalogPage(currPage, maxPage, catalogPage, productRow, productSheet);
            }
        }

        const xlsName = this.excelGenerator.saveWorkbook(workbook, MotodomScrapper.BASE_NAME);
        await this.logStore.storeLog(
            {
                finished: (new Date()).toISOString(),
                status: ScrapperStatus.COMPLETED,
                path: xlsName,
            },
            MotodomScrapper.BASE_NAME
        );
    }

    private async loadCatalogPage(page: number, oldMaxPage: number, catalogPage: string, productRow: number, productSheet): Promise<[number, number]> {
        let url = MotodomScrapper.BASE_URL.concat(catalogPage);
        if (page !== 1) {
            url = url.concat(MotodomScrapper.PAGE_URL, page.toString());
        }

        const response = await got(url);
        const $ = cheerioModule.load(response.body);

        // get maxPage
        let maxPage = oldMaxPage;
        if (page === 1) {
            const pageLinks = $('ul.pagination > li > a');
            if (pageLinks.length !== 0) {
                const lastPageHref = pageLinks[pageLinks.length - 1].attribs.href;

                maxPage = parseInt(MotodomScrapper.getPage(lastPageHref));
                if (isNaN(maxPage)) {
                    maxPage = oldMaxPage;
                }
            }
        }

        const products = $('div.main-products > div > div > div.caption > div.name > a');
        for (let i = 0; i < products.length; i++) {
            productRow += await this.loadProduct(products[i].attribs.href, productRow, productSheet);
        }

        await this.logStore.storeLog(
            {
                processed: productRow - 2,
            },
            MotodomScrapper.BASE_NAME
        );

        return [maxPage, productRow];
    }

    private async loadProduct(url: string, productRow: number, productSheet): Promise<number> {
        const response = await got(url),
            $ = cheerioModule.load(response.body);

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

        const names = $('div.page-title');
        if (names.length) {
            productInfo.name = names.html();
        }

        const manufacturers = $('div.product-manufacturer > a > span');
        if (manufacturers.length) {
            productInfo.manufacturer = manufacturers.html();
        }

        const descriptionBlocks = $('div.product_tabs-default > div.tab-content > div');
        if (descriptionBlocks.length) {
            const descriptionHtml = cheerioModule.html(descriptionBlocks[0].children),
                description$ = cheerioModule.load(descriptionHtml),
                descriptions = description$('div.block-content');
            if (descriptions.length) {
                productInfo.description = cheerioModule.text(descriptions);
                productInfo.descriptionHtml = descriptions.html();
            }
        }

        const images = $('div.main-image > div.swiper-container > div.swiper-wrapper > div.swiper-slide > img');
        images.each(
            (i, img) => {
                productInfo.photos.push(
                    img.attribs['data-largeimg']
                );
            }
        );

        const skus = $('font[data-ro="product_model"]');
        let productSku = '';
        if (skus.length) {
            productSku = skus.html();
        }

        const options = $('div.product-option-radio');
        if (options.length === 0) {
            productInfo.combinations.push([
                {
                    name: '',
                    value: ''
                }
            ]);

            const prices = $('div.product-price');
            if (prices.length) {
                productInfo.prices.push(
                    parseFloat(
                        cheerioModule.text(prices).replace(' ', '')
                    )
                );
            } else {
                productInfo.prices.push(0);
            }

            productInfo.skus.push(
                productSku
            );
        } else {
            const variants = [];

            options.each(
                (i, option) => {
                    const optionHtml = cheerioModule.html(option.children),
                        option$ = cheerioModule.load(optionHtml),
                        attrIds = option$('label.control-label');
                    if (attrIds.length === 0) {
                        return;
                    }
                    const attrId = attrIds.html().toLowerCase();
                    if (!this.productAttributes.has(attrId)) {
                        return;
                    }
                    const variantData = {
                        name: attrId,
                        optionId: '',
                        values: [],
                        names: [],
                    };

                    option$('div.radio > label > input').each(
                        (idx, input) => {
                            if (idx === 0) {
                                const matches = Array.from(
                                    (input.attribs.name as any).matchAll(/option\[(.*)\]/g),
                                    m => m[1]
                                );
                                if (matches.length) {
                                    variantData.optionId = matches[matches.length - 1];
                                }
                            }
                            variantData.values.push(
                                input.attribs.value
                            );
                        }
                    );

                    option$('div.radio > label > span').each(
                        (idx, span) => {
                            variantData.names.push(
                                cheerioModule.text(span.children)
                                    .replace(/\n/g, '')
                                    .replace(/\(.*\)/g, '')
                                    .replace(/^\s+/g, '')
                                    .replace(/\s+$/g, '')
                            );
                        }
                    );

                    variants.push(variantData);
                }
            );

            if (variants.length === 0) {
                return 0;
            }

            const productIds = $('#product-id');
            let productId = '';
            if (productIds.length) {
                productId = productIds[0].attribs.value;
            }

            const combinations = this.combinationGenerator.build([], variants);

            for (let i = 0; i < combinations.length; i++) {
                const combination = combinations[i],
                    combinationUrl = MotodomScrapper.BASE_URL.concat(MotodomScrapper.COMBINATION_URL),
                    combinationData: any = {
                        quantity: 1,
                        product_id: productId,
                        option: {}
                    };

                combination.forEach(
                    variantData => {
                        combinationData.option[variantData.optionId] = variantData.value;
                    }
                );

                const combinationResult = await got.post(
                    combinationUrl,
                    {
                        json: combinationData
                    }
                );

                const jsonResponse = JSON.parse(combinationResult.body);
                if (jsonResponse.response) {
                    if (jsonResponse.response.in_stock) {
                        if (jsonResponse.response.price) {
                            productInfo.prices.push(
                                parseFloat(jsonResponse.response.price)
                            );

                            const productCombination = [];

                            combination.forEach(
                                variantData => {
                                    productCombination.push({
                                        name: variantData.name,
                                        value: variantData.variantName
                                    })
                                }
                            );

                            productInfo.combinations.push(productCombination);

                            productInfo.skus.push(productSku);
                        }
                    }
                }
            }
        }

        return this.excelGenerator.addProductToSheet(
            productInfo,
            this.productAttributes,
            productRow,
            productSheet,
        );
    }
}
