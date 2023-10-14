import { Injectable } from '@nestjs/common';
import { ExcelGenerator } from '../../product/generator/excel.generator';
import { LogStore } from '../../log/store/log.store';
import got from 'got';
import cheerioModule from 'cheerio';
import { catalogList } from './catalog.list';
import { ProductInfo } from '../../product/type/product.info';
import { ScrapperInterface } from '../../product/scrapper/scrapper.interface';
import { ProductAttributeInfo } from '../../product/type/product-attribute.info';
import { ProductScrapper } from '../../scrapper/scrapper/product.scrapper';

@Injectable()
export class MotoCrazyTownScrapper implements ScrapperInterface {
  private static readonly BASE_URL = 'https://www.motocrazytown.com.ua';

  private static readonly CATALOG_URL = '/catalog-ua/';

  private static readonly PRODUCT_VARIATION_URL =
    '/catalog-ua/product/ajax_attrib_select_and_price/';

  private static readonly PAGE_URL = '?start=';

  private static readonly PAGE_STEP = 12;

  private static ATTRIBUTES_IDS = ['1', '2'];

  private static VARIANT_IDS = [
    ProductAttributeInfo.COLOR,
    ProductAttributeInfo.SIZE,
  ];

  constructor(
    private readonly excelGenerator: ExcelGenerator,
    private readonly logStore: LogStore,
  ) {}

  private static getPage(href) {
    const matches = Array.from(href.matchAll(/\?start=(.*)/g), (m) => m[1]);
    return matches[matches.length - 1];
  }

  public async startScrapping(
    productRow: number,
    productSheet: any,
  ): Promise<number> {
    for (let i = 0; i < catalogList.length; i++) {
      const catalogPage = catalogList[i];
      let maxPage = 0;
      for (
        let currPage = 0;
        currPage <= maxPage;
        currPage += MotoCrazyTownScrapper.PAGE_STEP
      ) {
        [maxPage, productRow] = await this.loadCatalogPage(
          currPage,
          maxPage,
          catalogPage,
          productRow,
          productSheet,
        );
      }
    }

    return productRow;
  }

  private async loadCatalogPage(
    page: number,
    oldMaxPage: number,
    catalogPage: string,
    productRow: number,
    productSheet,
  ): Promise<[number, number]> {
    let url = MotoCrazyTownScrapper.BASE_URL.concat(
      MotoCrazyTownScrapper.CATALOG_URL,
      catalogPage,
    );
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
          productRow += await this.loadProduct(
            products[i].attribs.href,
            productRow,
            productSheet,
          );
        } catch (e) {
          // do nothing, just ignore 404 error
        }
      }

      await this.logStore.storeLog(
        {
          processed: productRow - 2,
        },
        ProductScrapper.BASE_NAME,
      );
    } catch (e) {
      // do nothing, just ignore 404 error
    }

    return [maxPage, productRow];
  }

  private async loadProduct(
    productUrl: string,
    productRow: number,
    productSheet,
  ): Promise<number> {
    const url = MotoCrazyTownScrapper.BASE_URL.concat(productUrl),
      response = await got(url),
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
      supplier: 3,
      link: url,
    };

    const names = $('h1.title');
    if (names.length) {
      productInfo.name = names.html().replace(/(<span.*\/span>)/g, '');
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

    const categories = $(
      'ul[itemtype="https://schema.org/BreadcrumbList"] > li',
    );
    categories.each((i, li) => {
      if (i === 1 || i === 2) {
        const liHtml = cheerioModule.html(li.children),
          li$ = cheerioModule.load(liHtml),
          aEl = li$('a > span'),
          value = aEl.html();
        if (i === 1) {
          productInfo.parentCategory = value;
        } else {
          productInfo.category = value;
        }
      }
    });

    $('#list_product_image_middle > div > img').each((i, img) => {
      productInfo.photos.push(img.attribs.src);
    });

    const variantData = {
      id: '',
      name: '',
      values: [],
      names: [],
    };
    // First we need to get size, than color
    for (let i = MotoCrazyTownScrapper.ATTRIBUTES_IDS.length - 1; i >= 0; i--) {
      const attrId = MotoCrazyTownScrapper.ATTRIBUTES_IDS[i],
        selectId = `#jshop_attr_id${attrId}`,
        options = $(`${selectId} > option`);

      if (options.length !== 0) {
        variantData.id = MotoCrazyTownScrapper.VARIANT_IDS[i];
        variantData.name = attrId;

        options.each((i, option) => {
          variantData.values.push((option as any).attribs.value);
          variantData.names.push(cheerioModule.html((option as any).children));
        });

        // On this site we have only one variation
        // Or in case both variations color is not important
        break;
      }
    }

    if (variantData.name === '') {
      productInfo.combinations.push([
        {
          name: '',
          value: '',
        },
      ]);

      const prices = $('#block_price');
      if (prices.length) {
        productInfo.prices.push(
          parseFloat(cheerioModule.text(prices).replace(' ', '')),
        );
      } else {
        productInfo.prices.push(0);
      }

      const skus = $('#product_code');
      if (skus.length) {
        productInfo.skus.push(skus.html());
      } else {
        productInfo.skus.push('');
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
          productInfo.prices.push(parseFloat(responseJson.pricefloat));
        } else {
          productInfo.prices.push(0);
        }

        if (responseJson.ean) {
          productInfo.skus.push(responseJson.ean);
        } else {
          productInfo.skus.push('');
        }

        productInfo.combinations.push([
          {
            name: variantData.id,
            value: variantName,
          },
        ]);
      }
    }

    return this.excelGenerator.addProductToSheet(
      productInfo,
      productRow,
      productSheet,
    );
  }
}
