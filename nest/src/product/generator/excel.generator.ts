import {Injectable} from '@nestjs/common';
import * as xl from 'excel4node';
import {ProductAttributesMap} from '../type/product-attributes.map';
import {ProductInfo} from '../type/product.info';
import {ProductSheetConfig} from '../type/product-sheet.config';
import {CombinationGenerator} from './combination.generator';

@Injectable()
export class ExcelGenerator {

    public static readonly WORKBOOK_PATH = '/var/www/public/api/xls/'

    constructor(
        private readonly combinationGenerator: CombinationGenerator,
    ) {
    }

    public createWorkbook() {
        return new xl.Workbook();
    }

    public createProductSheet(workbook, productAttributes: ProductAttributesMap) {
        const productSheet = workbook.addWorksheet('Export products sheet', {});

        productSheet.cell(1, 1)
            .string('Название_позиции');

        productSheet.cell(1, 2)
            .string('Поисковые_запросы');

        productSheet.cell(1, 3)
            .string('Описание');

        productSheet.cell(1, 4)
            .string('Тип_товара');

        productSheet.cell(1, 5)
            .string('Цена');

        productSheet.cell(1, 6)
            .string('Валюта');

        productSheet.cell(1, 7)
            .string('Скидка');

        productSheet.cell(1, 8)
            .string('Единица_измерения');

        productSheet.cell(1, 9)
            .string('Ссылка_изображения');

        productSheet.cell(1, 10)
            .string('Наличие');

        productSheet.cell(1, 11)
            .string('Идентификатор_товара');

        productSheet.cell(1, 12)
            .string('Идентификатор_группы');

        productSheet.cell(1, 13)
            .string('Личные_заметки');

        productSheet.cell(1, 14)
            .string('Ссылка_на_товар_на_сайте');

        productAttributes.forEach(
            (attr) => {
                productSheet.cell(1, attr.column)
                    .string(attr.title);
            }
        )

        return productSheet;
    }

    public createGroupsSheet(workbook) {
        const otherSheet = workbook.addWorksheet('Export groups sheet');

        otherSheet.cell(1, 1)
            .string('Номер_группы');

        otherSheet.cell(1, 2)
            .string('Название_группы');

        otherSheet.cell(1, 3)
            .string('Идентификатор_группы');

        otherSheet.cell(1, 4)
            .string('Номер_родителя');

        otherSheet.cell(1, 5)
            .string('Идентификатор_родителя');
    }

    public addProductToSheet(productInfo: ProductInfo, productAttributes: ProductAttributesMap, productRow: number, productSheet): number {
        let added = 0;

        const combinationsList = this.combinationGenerator.build([], productInfo.variants);

        combinationsList.forEach(
            combination => {
                combination.forEach(
                    variantInfo => {
                        if (variantInfo.name !== '' && productAttributes.has(variantInfo.name)) {
                            productSheet
                                .cell(
                                    productRow + added,
                                    productAttributes.get(variantInfo.name).column
                                )
                                .string(
                                    variantInfo.value
                                );
                        }
                    }
                );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.NAME)
                    .string(
                        productInfo.name
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.AVAILABLE)
                    .string(
                        productInfo.available
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.CURRENCY)
                    .string(
                        productInfo.currency
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.DESCRIPTION)
                    .string(
                        productInfo.description
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.PRICE)
                    .number(
                        productInfo.price
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.DISCOUNT)
                    .string(
                        productInfo.discount
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.UNIT_NAME)
                    .string(
                        productInfo.unitName
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.SKU)
                    .string(
                        productInfo.sku
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.IMAGE_URL)
                    .string(
                        productInfo.photos.join(', ')
                    );

                productSheet
                    .cell(productRow + added, ProductSheetConfig.PRODUCT_URL)
                    .string(
                        productInfo.link
                    );

                added++;
            }
        )

        return added;
    }

    public saveWorkbook(workbook, name: string): string {
        const xlsName = name.concat('.xlsx');
        workbook.write(ExcelGenerator.WORKBOOK_PATH.concat(xlsName));
        return xlsName;
    }
}
