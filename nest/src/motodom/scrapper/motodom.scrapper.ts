import {Injectable} from '@nestjs/common';
import {ExcelGenerator} from '../../product/generator/excel.generator';
import {LogStore} from '../../log/store/log.store';
import got from 'got';
import cheerioModule from 'cheerio';
import {ProductInfo} from '../../product/type/product.info';
import {catalogList} from './catalog.list';
import {CombinationGenerator} from '../../product/generator/combination.generator';
import {ProductAttributeInfo} from "../../product/type/product-attribute.info";
import {ProductScrapper} from "../../scrapper/scrapper/product.scrapper";
import {ScrapperInterface} from "../../product/scrapper/scrapper.interface";

@Injectable()
export class MotodomScrapper implements ScrapperInterface {
    private static readonly BASE_URL = 'https://motodom.ua/';

    private static readonly PAGE_URL = '?page=';

    private static readonly COMBINATION_URL = 'index.php?route=journal3/price&popup=0';

    private static readonly PAGE_STEP = 1;

    constructor(
        private readonly excelGenerator: ExcelGenerator,
        private readonly logStore: LogStore,
        private readonly combinationGenerator: CombinationGenerator,
    ) {
    }

    private static getPage(href) {
        const matches = Array.from(href.matchAll(/\?page=(.*)/g), m => m[1]);
        return matches[matches.length - 1];
    }

    public async startScrapping(productRow: number, productSheet: any): Promise<number> {
        for (let i = 0; i < catalogList.length; i++) {
            const catalogPage = catalogList[i];
            let maxPage = 1;
            for (let currPage = 1; currPage <= maxPage; currPage += MotodomScrapper.PAGE_STEP) {
                [maxPage, productRow] = await this.loadCatalogPage(currPage, maxPage, catalogPage, productRow, productSheet);
            }
        }

        return productRow;
    }

    private async loadCatalogPage(page: number, oldMaxPage: number, catalogPage: string, productRow: number, productSheet): Promise<[number, number]> {
        let url = MotodomScrapper.BASE_URL.concat(catalogPage);
        if (page !== 1) {
            url = url.concat(MotodomScrapper.PAGE_URL, page.toString());
        }

        let maxPage = oldMaxPage;

        try {
            const response = await got(url);
            const $ = cheerioModule.load(response.body);

            // get maxPage
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
                ProductScrapper.BASE_NAME
            );
        } catch (e) {
            // do nothing, just ignore 404 error
        }

        return [maxPage, productRow];
    }

    private async loadProduct(url: string, productRow: number, productSheet): Promise<number> {
        const response = await got(url),
            $ = cheerioModule.load(response.body);

        const productInfo: ProductInfo = {
            skus: [],
            manufacturer: '',
            barcode: '',
            sex: '',
            parentCategory: '',
            category: '',
            name: '',
            amount: 1,
            priceWholesaleUsd: '0',
            priceUsd: '0',
            prices: [],
            description: '',
            descriptionHtml: '',
            kit: '',
            photos: [],
            combinations: [],
            supplier: 2,
            link: url,
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

        const categories = $('ul.breadcrumb > li');
        categories.each(
            (i, li) => {
                if (i === 1 || i === 2) {
                    const liHtml = cheerioModule.html(li.children),
                        li$ = cheerioModule.load(liHtml),
                        aEl = li$('a'),
                        value = aEl.html();
                    if (i === 1) {
                        productInfo.parentCategory = value;
                    } else {
                        productInfo.category = value;
                    }
                }
            }
        );

        const skus = $('font[data-ro="product_model"]');
        let productSku = '';
        if (skus.length) {
            productSku = skus.html();
        }

        const options = $('div.product-option-radio');
        if (options.length === 0) {
            const inStocks = $('font[data-ro="product_stock"]');
            if (inStocks.length) {
                const inStock = cheerioModule.text(inStocks).toLowerCase();
                if (inStock !== 'в наличии') {
                    return 0;
                }
            }

            productInfo.combinations.push([
                {
                    name: '',
                    value: ''
                }
            ]);

            const prices = $('div.product-price');
            if (prices.length) {
                const priceValue = parseFloat(
                    cheerioModule.text(prices).replace(' ', '')
                );
                if (priceValue === 0) {
                    return 0;
                }

                productInfo.prices.push(priceValue);
            } else {
                return 0;
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

                    const variantId = (attrId === 'цвет')? ProductAttributeInfo.COLOR : ((attrId === 'размер')? ProductAttributeInfo.SIZE : '');

                    if (variantId === '') return;

                    const variantData = {
                        id: variantId,
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
                    if (jsonResponse.response.in_stock || combination.length === 1) {
                        if (jsonResponse.response.price) {
                            productInfo.prices.push(
                                parseFloat(jsonResponse.response.price)
                            );

                            const productCombination = [];

                            combination.forEach(
                                variantData => {
                                    productCombination.push({
                                        name: variantData.id,
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
            productRow,
            productSheet,
        );
    }
}
