import { Injectable } from '@nestjs/common';
import { ScrapperInterface } from '../../product/scrapper/scrapper.interface';
import { ExcelGenerator } from '../../product/generator/excel.generator';
import { LogStore } from '../../log/store/log.store';
import { catalogList } from './catalog.list';
import got from 'got';
import cheerioModule from 'cheerio';
import { ProductScrapper } from '../../scrapper/scrapper/product.scrapper';
import { ProductInfo } from '../../product/type/product.info';
import { ProductAttributeInfo } from '../../product/type/product-attribute.info';

@Injectable()
export class RsvmotoScrapper implements ScrapperInterface {
  private static readonly BASE_URL = 'https://rsvmoto.com.ua';

  constructor(
    private readonly excelGenerator: ExcelGenerator,
    private readonly logStore: LogStore,
  ) {}

  public async startScrapping(
    productRow: number,
    productSheet: any,
  ): Promise<number> {
    for (let i = 0; i < catalogList.length; i++) {
      const catalogPage = catalogList[i];
      productRow = await this.loadCatalogPage(
        catalogPage,
        productRow,
        productSheet,
      );
    }

    return productRow;
  }

  private async loadCatalogPage(
    catalogPage: string,
    productRow: number,
    productSheet: any,
  ): Promise<number> {
    const url = RsvmotoScrapper.BASE_URL.concat(catalogPage, '/page-all');

    try {
      const response = await got(url);
      const $ = cheerioModule.load(response.body);

      const products = $('div.product_item > div > div');
      for (let i = 0; i < products.length; i++) {
        try {
          // first need to check if product is in stock
          const productHtml = cheerioModule.html(products[i].children),
            $product = cheerioModule.load(productHtml),
            inStockButton = $product(
              'div.product_preview__bottom > form > div.product_preview__buttons > button.fn_is_stock',
            );
          if (inStockButton.length === 0) {
            continue;
          }
          const btn = inStockButton[0],
            cssClasses = btn.attribs.class;
          if (cssClasses.includes('hidden-xs-up')) {
            continue;
          }
          const productLink = $product(
            'div.product_preview__center > div.product_preview__image > a',
          )[0].attribs.href;

          productRow += await this.loadProduct(
            productLink,
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

    return productRow;
  }

  private async loadProduct(
    productUrl: string,
    productRow: number,
    productSheet,
  ): Promise<number> {
    const url = RsvmotoScrapper.BASE_URL.concat(productUrl);
    try {
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
        amount: [],
        priceWholesaleUsd: '0',
        priceUsd: '0',
        prices: [],
        description: '',
        descriptionHtml: '',
        kit: '',
        photos: [],
        combinations: [],
        supplier: 7,
        link: url,
      };

      const features = $('div.features__value');
      let color = '';
      for (const feature of features) {
        color = cheerioModule.text(feature.children).replace(/\s+/g, ' ');
        break;
      }

      const variantOptions = $('select.fn_variant > option');
      for (const option of variantOptions) {
        const amount = parseInt(option.attribs['data-stock']);
        if (amount === 0) {
          continue;
        }
        productInfo.amount.push(amount);
        productInfo.skus.push(option.attribs['data-sku']);
        productInfo.prices.push(
          parseFloat(option.attribs['data-price'].replace(/\s/g, '')),
        );
        const combinations = [
          {
            name: ProductAttributeInfo.SIZE,
            value:
              variantOptions.length === 1
                ? ''
                : cheerioModule.text(option.children),
          },
        ];
        if (color !== '') {
          combinations.push({
            name: ProductAttributeInfo.COLOR,
            value: color,
          });
        }
        productInfo.combinations.push(combinations);
      }

      // skip not in stock products
      if (productInfo.skus.length === 0) {
        return 0;
      }

      const title = $('h1.block__heading > span');
      if (title.length > 0) {
        productInfo.name = title.html();
      }

      const descriptions = $('#description > div.mobile_tab__content > div');
      if (descriptions.length) {
        productInfo.description = cheerioModule.text(descriptions);
        productInfo.descriptionHtml = descriptions.html();
      }

      const manufacturerImg = $('img.brand_img');
      if (manufacturerImg.length) {
        productInfo.manufacturer = manufacturerImg[0].attribs.alt;
      }

      const photos = $('div.product-page__img > div > a');
      for (const photo of photos) {
        productInfo.photos.push(photo.attribs.href);
      }

      const breadCrumbs = $('li.breadcrumbs__item > a > span');
      for (
        let breadcrumbIdx = 0;
        breadcrumbIdx < breadCrumbs.length;
        breadcrumbIdx++
      ) {
        if (breadcrumbIdx === 1) {
          productInfo.parentCategory = cheerioModule.text(
            breadCrumbs[breadcrumbIdx].children,
          );
        } else if (breadcrumbIdx === 2) {
          productInfo.category = cheerioModule.text(
            breadCrumbs[breadcrumbIdx].children,
          );
        }
      }

      return this.excelGenerator.addProductToSheet(
        productInfo,
        productRow,
        productSheet,
      );
    } catch (e) {
      // do nothing, just ignore 404 error
    }
    return 0;
  }
}
