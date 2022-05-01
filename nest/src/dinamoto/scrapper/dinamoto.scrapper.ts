import {Injectable} from '@nestjs/common';
import {ExcelGenerator} from '../../product/generator/excel.generator';
import {LogStore} from '../../log/store/log.store';
import got from 'got';
import {ProductInfo} from '../../product/type/product.info';
import cheerioModule from 'cheerio';
import {CombinationGenerator} from '../../product/generator/combination.generator';
import {ScrapperInterface} from "../../product/scrapper/scrapper.interface";
import {ProductScrapper} from "../../scrapper/scrapper/product.scrapper";
import {ProductAttributeInfo} from "../../product/type/product-attribute.info";
import {catalogList} from "./catalog.list";
// import {catalogList} from "./catalog.list";

@Injectable()
export class DinamotoScrapper implements ScrapperInterface {
    private static readonly BASE_URL = 'http://dinamoto.com.ua/';

    private static readonly PAGE_URL = '?page=';

    private static readonly PAGE_STEP = 1;

    constructor(
        private readonly excelGenerator: ExcelGenerator,
        private readonly logStore: LogStore,
        private readonly combinationGenerator: CombinationGenerator,
    ) {
    }

    public async startScrapping(productRow: number, productSheet: any): Promise<number> {
        for (let i = 0; i < catalogList.length; i++) {
            const catalogPage = catalogList[i];
            let maxPage = 1;
            for (let currPage = 1; currPage <= maxPage; currPage += DinamotoScrapper.PAGE_STEP) {
                [maxPage, productRow] = await this.loadCatalogPage(currPage, maxPage, catalogPage, productRow, productSheet);
            }
        }

        return productRow;
    }

    private static getPage(href) {
        const matches = Array.from(href.matchAll(/\?page=(.*)/g), m => m[1]);
        return matches[matches.length - 1];
    }

    private async loadCatalogPage(page: number, oldMaxPage: number, catalogPage: string, productRow: number, productSheet): Promise<[number, number]> {
        let url = DinamotoScrapper.BASE_URL.concat(catalogPage);
        if (page !== 1) {
            url = url.concat(DinamotoScrapper.PAGE_URL, page.toString());
        }

        // get maxPage
        let maxPage = oldMaxPage;

        try {
            const response = await got(url);
            const $ = cheerioModule.load(response.body);

            if (page === 1) {
                const pageLinks = $('a.page-link');

                if (pageLinks.length > 2) {
                    const lastPageHref = pageLinks[pageLinks.length - 2].attribs.href;
                    maxPage = parseInt(DinamotoScrapper.getPage(lastPageHref));
                }
            }

            let parentCategory = '', category = '';
            const categories = $('ol.breadcrumb > li');
            categories.each(
                (i, li) => {
                    if (i === 1 || i === 2) {
                        const value = cheerioModule.text(li.children);
                        if (i === 1) {
                            parentCategory = value;
                        } else {
                            category = value;
                        }
                    }
                }
            );

            const products = $('ul.list-product > li > div.block');
            for (let i = 0; i < products.length; i++) {
                if (products[i].attribs.class.includes('add-new-product')) continue;
                const productHtml = cheerioModule.html(products[i].children),
                    product$ = cheerioModule.load(productHtml),
                    productA = product$('a');
                if (productA.length === 0) continue;

                try {
                    productRow += await this.loadProduct(productA[0].attribs.href, productRow, productSheet, parentCategory, category);
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

    private async loadProduct(url: string, productRow: number, productSheet, parentCategory: string, category: string): Promise<number> {
        const response = await got(url);
        const $ = cheerioModule.load(response.body);

        const buyDiv = $('div.block-btn-item-buy');
        if (buyDiv.length === 0) {
            // skip not available product
            return 0;
        }

        const productInfo: ProductInfo = {
            skus: [],
            manufacturer: '',
            barcode: '',
            sex: '',
            parentCategory: parentCategory,
            category: category,
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
            supplier: 1,
            link: url,
        };

        const names = $('h2.title-product');
        if (names.length) {
            productInfo.name = names.html();
        }

        // const descriptions = $('#details > p');
        // if (descriptions.length) {
        //     productInfo.descriptionHtml = descriptions.html();
        //     productInfo.description = cheerioModule.text(descriptions);
        // }

        const sex = $('block-sex');
        if (sex.length) {
            const sexList: string[] = JSON.parse(sex[0].attribs[':sexs']);
            productInfo.sex = sexList.join(' ');
        }

        let productSku = '';
        const sku = $('#CardProductAttr > div > span.article');
        if (sku.length) {
            const skuArr = sku.html().split(' ');
            skuArr.shift();
            productSku = skuArr.join(' ');
        }

        const prices = $('#CardProductAttr > div.price > span');
        let productPrice = 0;
        if (prices.length) {
            productPrice = parseFloat(cheerioModule.text(prices[0].children));
        }

        $('#details > table > tbody > tr').each(
            (idx, row) => {
                if (idx !== 0) return;
                let rowHtml = cheerioModule.html(row.children);
                rowHtml = rowHtml.replace(/td/gi, 'div')
                const row$ = cheerioModule.load(rowHtml);

                row$('div').each(
                    (colIdx, col) => {
                        if (colIdx === 1) {
                            productInfo.manufacturer = cheerioModule.text(col.children);
                        }
                    }
                )
            }
        );

        const variants = [];

        const size = $('block-size');
        if (size.length) {
            const sizeList: string[] = JSON.parse(size[0].attribs[':sizes']);
            if (sizeList.length > 0) {
                variants.push({
                    id: ProductAttributeInfo.SIZE,
                    name: ProductAttributeInfo.SIZE,
                    optionId: '',
                    values: sizeList,
                    names: [],
                });
            }
        }

        const color = $('block-color');
        if (color.length) {
            const colorList: string[] = JSON.parse(color[0].attribs[':colors']);
            if (colorList.length > 0) {
                variants.push({
                    id: ProductAttributeInfo.COLOR,
                    name: ProductAttributeInfo.COLOR,
                    optionId: '',
                    values: colorList,
                    names: [],
                });
            }
        }

        if (variants.length === 0) {
            variants.push(
                {
                    id: '',
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

        $('section.d-md-none > div > div > div > div > div > div.thumbImg > img').each(
            (i, img) => {
                productInfo.photos.push(img.attribs.src);
            }
        );

        return this.excelGenerator.addProductToSheet(
            productInfo,
            productRow,
            productSheet,
        );
    }

}
