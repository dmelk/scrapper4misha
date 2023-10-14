import { Injectable } from '@nestjs/common';
import * as xl from 'excel4node';
import { ProductInfo } from '../type/product.info';
import { ProductSheetConfig } from '../type/product-sheet.config';
import { ProductAttributeInfo } from '../type/product-attribute.info';

@Injectable()
export class ExcelGenerator {
  public static readonly WORKBOOK_PATH = '/var/www/public/api/xls/';

  public createWorkbook() {
    return new xl.Workbook();
  }

  public createProductSheet(workbook) {
    const productSheet = workbook.addWorksheet('Export products sheet', {});

    productSheet.cell(1, 1).string('Артикул');

    productSheet.cell(1, 2).string('Бренд');

    productSheet.cell(1, 3).string('Цвет');

    productSheet.cell(1, 4).string('Штрих код');

    productSheet.cell(1, 5).string('Размер');

    productSheet.cell(1, 6).string('Пол');

    productSheet.cell(1, 7).string('Раздел');

    productSheet.cell(1, 8).string('Категория');

    productSheet.cell(1, 9).string('Название');

    productSheet.cell(1, 10).string('Остаток по складу');

    productSheet.cell(1, 11).string('Цена опт, $');

    productSheet.cell(1, 12).string('Цена розница, $');

    productSheet.cell(1, 13).string('Цена розница, грн');

    productSheet.cell(1, 14).string('Описание');

    productSheet.cell(1, 15).string('Изображения');

    productSheet.cell(1, 16).string('Комплекты');

    productSheet.cell(1, 17).string('Поставщик');

    productSheet.cell(1, 18).string('URL');

    return productSheet;
  }

  public createGroupsSheet(workbook) {
    const otherSheet = workbook.addWorksheet('Export groups sheet');

    otherSheet.cell(1, 1).string('Номер_группы');

    otherSheet.cell(1, 2).string('Название_группы');

    otherSheet.cell(1, 3).string('Идентификатор_группы');

    otherSheet.cell(1, 4).string('Номер_родителя');

    otherSheet.cell(1, 5).string('Идентификатор_родителя');
  }

  public addProductToSheet(
    productInfo: ProductInfo,
    productRow: number,
    productSheet,
  ): number {
    let added = 0;

    // console.log(productInfo, productInfo.combinations);

    productInfo.combinations.forEach((combination, idx) => {
      combination.forEach((variantInfo) => {
        if (variantInfo.name === ProductAttributeInfo.COLOR) {
          productSheet
            .cell(productRow + added, ProductSheetConfig.COLOR)
            .string(variantInfo.value);
        }
        if (variantInfo.name === ProductAttributeInfo.SIZE) {
          productSheet
            .cell(productRow + added, ProductSheetConfig.SIZE)
            .string(variantInfo.value);
        }
      });

      productSheet
        .cell(productRow + added, ProductSheetConfig.SKU)
        .string(productInfo.skus[idx]);

      productSheet
        .cell(productRow + added, ProductSheetConfig.MANUFACTURER)
        .string(productInfo.manufacturer);

      productSheet
        .cell(productRow + added, ProductSheetConfig.NAME)
        .string(productInfo.name);

      productSheet
        .cell(productRow + added, ProductSheetConfig.BARCODE)
        .string(productInfo.barcode);

      productSheet
        .cell(productRow + added, ProductSheetConfig.SEX)
        .string(productInfo.sex);

      productSheet
        .cell(productRow + added, ProductSheetConfig.PARENT_CATEGORY)
        .string(productInfo.parentCategory);

      productSheet
        .cell(productRow + added, ProductSheetConfig.CATEGORY)
        .string(productInfo.category);

      productSheet
        .cell(productRow + added, ProductSheetConfig.AMOUNT)
        .string(productInfo.amount.toFixed(0));

      productSheet
        .cell(productRow + added, ProductSheetConfig.PRICE_WHOLESALE_USD)
        .string(productInfo.priceWholesaleUsd);

      productSheet
        .cell(productRow + added, ProductSheetConfig.PRICE_USD)
        .string(productInfo.priceUsd);

      productSheet
        .cell(productRow + added, ProductSheetConfig.PRICE)
        .number(productInfo.prices[idx]);

      productSheet
        .cell(productRow + added, ProductSheetConfig.DESCRIPTION)
        .string(productInfo.description);

      productSheet
        .cell(productRow + added, ProductSheetConfig.IMAGE_URL)
        .string(productInfo.photos.join(', '));

      productSheet
        .cell(productRow + added, ProductSheetConfig.KIT)
        .string(productInfo.kit);

      productSheet
        .cell(productRow + added, ProductSheetConfig.SUPPLIER)
        .string(productInfo.supplier.toFixed(0));

      productSheet
        .cell(productRow + added, ProductSheetConfig.PRODUCT_URL)
        .string(productInfo.link);

      added++;
    });

    return added;
  }

  public saveWorkbook(workbook, name: string): string {
    const xlsName = name.concat('.xlsx');
    workbook.write(ExcelGenerator.WORKBOOK_PATH.concat(xlsName));
    return xlsName;
  }
}
