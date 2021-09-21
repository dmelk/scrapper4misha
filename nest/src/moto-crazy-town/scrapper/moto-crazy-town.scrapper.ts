import {Injectable} from '@nestjs/common';
import {ProductAttributesMap} from '../../product/type/product-attributes.map';
import {ExcelGenerator} from '../../product/generator/excel.generator';
import {LogStore} from '../../log/store/log.store';
import {ProductAttributeInterface} from '../../product/type/product-attribute.interface';
import got from 'got';
import cheerioModule from 'cheerio';
import {ScrapperStatus} from '../../log/type/scrapper.status';
import {catalogList} from './catalog.list';
import {ProductInfo} from '../../product/type/product.info';

@Injectable()
export class MotoCrazyTownScrapper {
    private static readonly BASE_NAME = 'motocrazytown';

    private static readonly BASE_URL = 'https://www.motocrazytown.com.ua';

    private static readonly CATALOG_URL = '/catalog/';

    private static readonly PRODUCT_VARIATION_URL = '/catalog/product/ajax_attrib_select_and_price/';

    private static readonly PAGE_URL = '?start=';

    private static readonly PAGE_STEP = 12;

    private static ATTRIBUTES_IDS = ['1', '2'];

    private readonly productAttributes: ProductAttributesMap;

    constructor(
        private readonly excelGenerator: ExcelGenerator,
        private readonly logStore: LogStore,
    ) {
        this.productAttributes = new Map<string, ProductAttributeInterface>();
        this.productAttributes.set(
            '1',
            {
                title: 'Цвет',
                column: 15,
            }
        );
        this.productAttributes.set(
            '2',
            {
                title: 'Размер',
                column: 16,
            }
        );
    }

    private static getPage(href) {
        const matches = Array.from(href.matchAll(/\?start=(.*)/g), m => m[1]);
        return matches[matches.length - 1];
    }

    public async startScrapping(): Promise<string> {
        await this.logStore.storeLog(
            {
                status: ScrapperStatus.IN_PROGRESS,
                started: (new Date()).toISOString(),
                processed: 0
            },
            MotoCrazyTownScrapper.BASE_NAME
        );

        const workbook = this.excelGenerator.createWorkbook(),
            productSheet = this.excelGenerator.createProductSheet(workbook, this.productAttributes);

        this.excelGenerator.createGroupsSheet(workbook);

        let productRow = 2;
        for (let i = 0; i < catalogList.length; i++) {
            const catalogPage = catalogList[i];
            let maxPage = 0;
            for (let currPage = 0; currPage <= maxPage; currPage += MotoCrazyTownScrapper.PAGE_STEP) {
                [maxPage, productRow] = await this.loadCatalogPage(currPage, maxPage, catalogPage, productRow, productSheet);
            }
        }

        const xlsName = this.excelGenerator.saveWorkbook(workbook, MotoCrazyTownScrapper.BASE_NAME);
        await this.logStore.storeLog(
            {
                finished: (new Date()).toISOString(),
                status: ScrapperStatus.COMPLETED,
                path: xlsName,
            },
            MotoCrazyTownScrapper.BASE_NAME
        );

        return xlsName;
    }

    private async loadCatalogPage(page: number, oldMaxPage: number, catalogPage: string, productRow: number, productSheet): Promise<[number, number]> {
        let url = MotoCrazyTownScrapper.BASE_URL.concat(MotoCrazyTownScrapper.CATALOG_URL, catalogPage);
        if (page !== 0) {
            url = url.concat(MotoCrazyTownScrapper.PAGE_URL, page.toString());
        }

        let maxPage = oldMaxPage;

        try {
            const response = await got(url);
            const $ = cheerioModule.load(response.body);

            // get maxPage
            if (page === 0) {
                const pageLinks = $('a.page-link');
                if (pageLinks.length !== 0) {
                    const lastPageHref = pageLinks[pageLinks.length - 1].attribs.href;

                    maxPage = parseInt(MotoCrazyTownScrapper.getPage(lastPageHref));
                }
            }

            const catalogHtml = cheerioModule.html($('div.jshop_list_category')),
                catalog$ = cheerioModule.load(catalogHtml);
            const products = catalog$('a.product');
            for (let i = 0; i < products.length; i++) {
                try {
                    productRow += await this.loadProduct(products[i].attribs.href, productRow, productSheet);
                } catch (e) {
                    // do nothing, just ignore 404 error
                }
            }

            await this.logStore.storeLog(
                {
                    processed: productRow - 2,
                },
                MotoCrazyTownScrapper.BASE_NAME
            );
        } catch (e) {
            // do nothing, just ignore 404 error
        }

        return [maxPage, productRow];
    }

    private async loadProduct(productUrl: string, productRow: number, productSheet): Promise<number> {
        const url = MotoCrazyTownScrapper.BASE_URL.concat(productUrl),
            response = await got(url),
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

        const names = $('h1.title');
        if (names.length) {
            productInfo.name = names.html()
                .replace(/(<span.*\/span>)/g, '');
        }

        const manufacturers = $('div.product-info > div.manufacturer_name > span');
        if (manufacturers.length) {
            productInfo.manufacturer = manufacturers.html();
        }

        const descriptions = $('#description');
        if (descriptions.length) {
            productInfo.descriptionHtml = descriptions.html();
            productInfo.description = cheerioModule.text(descriptions);
        }

        $('#list_product_image_middle > div > img').each(
            (i, img) => {
                productInfo.photos.push(img.attribs.src);
            }
        )

        const variantData = {
            name: '',
            values: [],
            names: [],
        };
        for (let i = 0; i < MotoCrazyTownScrapper.ATTRIBUTES_IDS.length; i++) {
            const attrId = MotoCrazyTownScrapper.ATTRIBUTES_IDS[i],
                selectId = `#jshop_attr_id${attrId}`,
                options = $(`${selectId} > option`);

            if (options.length !== 0) {
                variantData.name = attrId;

                options.each(
                    (i, option) => {
                        variantData.values.push(
                            (option as any).attribs.value
                        );
                        variantData.names.push(
                            cheerioModule.html((option as any).children)
                        );
                    }
                );

                // On this site we have only one variation
                break;
            }
        }

        if (variantData.name === '') {
            productInfo.combinations.push([
                {
                    name: '',
                    value: ''
                }
            ]);

            const prices = $('#block_price');
            if (prices.length) {
                productInfo.prices.push(
                    parseFloat(
                        cheerioModule.text(prices).replace(' ', '')
                    )
                );
            } else {
                productInfo.prices.push(0);
            }

            const skus = $('#product_code');
            if (skus.length) {
                productInfo.skus.push(
                    skus.html()
                );
            } else {
                productInfo.skus.push(
                    ''
                );
            }

        } else {
            // need to get prices for each variation
            for (let i = 0; i < variantData.values.length; i++) {
                const variantValue = variantData.values[i],
                    variantName = variantData.names[i],
                    productIds = $('#product_id');
                if (!productIds) {
                    return 0;
                }

                const productId = productIds[0].attribs.value,
                    variantUrl = `${MotoCrazyTownScrapper.BASE_URL}${MotoCrazyTownScrapper.PRODUCT_VARIATION_URL}${productId}?ajax=1&change_attr=${variantData.name}&qty=1&attr[${variantData.name}]=${variantValue}`;

                const variantResponse = await got(variantUrl),
                    responseJson = JSON.parse(variantResponse.body);

                if (responseJson.pricefloat) {
                    productInfo.prices.push(
                        parseFloat(responseJson.pricefloat)
                    );
                } else {
                    productInfo.prices.push(0);
                }

                if (responseJson.ean) {
                    productInfo.skus.push(
                        responseJson.ean
                    );
                } else {
                    productInfo.skus.push('');
                }

                productInfo.combinations.push([
                    {
                        name: variantData.name,
                        value: variantName
                    }
                ]);
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
