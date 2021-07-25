const cheerio = require('cheerio');
const got = require('got');
const xl = require('excel4node');

const baseUrl= 'http://dinamoto.com.ua/';
const catalogUrl = 'catalog/';

const pageUrl = 'page/';
const pageStep = 20;

let maxPage = 0;

class ProductSheetConfig {
    static NAME = 1;
    static DESCRIPTION = 3;
    static PRICE = 5;
    static CURRENCY = 6;
    static DISCOUNT = 7;
    static UNIT_NAME = 8;
    static IMAGE_URL = 9;
    static AVAILABLE = 10;
    static SKU = 11;
    static PRODUCT_URL = 14;
}

const productAttributes = {
    'цвет': {
        title: 'Цвет',
        column: 15,
    },
    'размеры': {
        title: 'Размер',
        column: 16,
    },
}



const createWorkbook = () => {
    return new xl.Workbook();
}

const createSheet = (workbook, name) => {
    const productSheet = workbook.addWorksheet(name, {});

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

    for (let key in productAttributes) {
        if (!productAttributes.hasOwnProperty(key)) continue;
        productSheet.cell(1, productAttributes[key].column)
            .string(productAttributes[key].title);
    }

    return productSheet;
}

const generateOtherGroupsSheet = (workbook) => {
    const otherSheet = createSheet(workbook, 'Export groups sheet');

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

const getPage = (href) => {
    const matches = Array.from(href.matchAll(/\?p=(.*)/g), m => m[1]);
    return matches[matches.length - 1];
}

const buildCombinationList = (list, variants) => {
    if (variants.length === 0) {
        return list;
    }

    const variantCopy = variants.slice(),
        currVariant = variantCopy.pop(),
        newList = [];

    currVariant.values.forEach(
        variantValue => {
            if (list.length === 0) {
                newList.push([
                    {
                        name: currVariant.name,
                        value: variantValue
                    }
                ]);
            } else {
                list.forEach(
                    listElem => {
                        const newElem = listElem.slice();
                        newElem.push(
                            {
                                name: currVariant.name,
                                value: variantValue
                            }
                        );
                        newList.push(newElem);
                    }
                );
            }
        }
    );

    return buildCombinationList(newList, variantCopy);
}

const storeProductToSheet = (productInfo, productSheet, productRow) => {
    let added = 0;

    const combinationsList = buildCombinationList([], productInfo.variants);

    combinationsList.forEach(
        combination => {
            combination.forEach(
                variantInfo => {
                    if (variantInfo.name !== '' && productAttributes.hasOwnProperty(variantInfo.name)) {
                        productSheet
                            .cell(
                                productRow + added,
                                productAttributes[variantInfo.name].column
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

const loadProduct = async (url, productSheet, productRow) => {
    // console.log('Fetching product', url);

    const response = await got(url);
    const $ = cheerio.load(response.body);

    let productInfo = {
        link: url,
        currency: 'грн.',
        available: '+',
        name: '',
        manufacturer: '',
        sku: '',
        price: 0,
        description: '',
        descriptionHtml: '',
        unitName: 'шт.',
        discount: '',
        variants: [],
        photos: [],
    };

    const names = $('h1[property="name"]');
    if (names) {
        productInfo.name = names.html();
    }

    const descriptions = $('span[property="description"]');
    if (descriptions) {
        productInfo.descriptionHtml = descriptions.html();
        productInfo.description = cheerio.default.text(descriptions);
    }

    const prices = $('meta[property="price"]');
    if (prices) {
        productInfo.price = parseFloat(prices[0].attribs.content);
    }

    $('div.catalog-item-info-inside > div').each(
        (i, div) => {
            if (i === 0) {
                // manufacturer
                productInfo.manufacturer = $('p', div).html();
                return;
            }
            if (i === 1) {
                // vendorCode
                productInfo.sku = $('p', div).html();
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
                            cheerio.default.text(a.children)
                        );
                    }
                }
            );
            if (variant.values.length !== 0) {
                productInfo.variants.push(variant);
            }
        }
    )

    if (productInfo.variants.length === 0) {
        productInfo.variants.push(
            {
                name: '',
                values: [''],
            }
        );
    }

    $('ul.catalog-photos > li > a').each(
        (i, a) => {
            productInfo.photos.push(baseUrl.concat(a.attribs.href));
        }
    )

    return storeProductToSheet(productInfo, productSheet, productRow);

    // console.log(productInfo);
}

const loadCatalogPage = async (page, productSheet, productRow) => {

    let url = baseUrl.concat(catalogUrl);
    if (page !== 0) {
        url = url.concat(pageUrl, page.toString());
    }

    const response = await got(url);
    const $ = cheerio.load(response.body);

    // get maxPage
    if (page === 0) {
        const pageLinks = $('div.wrapPaging > a'),
            lastPageHref = pageLinks[pageLinks.length-1].attribs.href;

        maxPage = getPage(lastPageHref);
        // maxPage = 40;
        console.log('Fetched total pages ', maxPage);
    }

    console.log('Loading page ', page);
    const products = $('div.catalog-list > div > ul > li > a');
    // productRow += await loadProduct(products[0].attribs.href, productSheet, productRow);
    // productRow += await loadProduct(products[1].attribs.href, productSheet, productRow);
    for (let i = 0; i < products.length; i++) {
        productRow += await loadProduct(products[i].attribs.href, productSheet, productRow);
    }

    return productRow;
}

(async () => {
    const workbook = createWorkbook(),
        productSheet = createSheet(workbook, 'Export products sheet');

    generateOtherGroupsSheet(workbook);

    let productRow = 2;
    for (let currPage = 0; currPage <= maxPage; currPage += pageStep) {
        productRow = await loadCatalogPage(currPage, productSheet, productRow);
        // break;
    }

    const xlsPath = '/var/www/',
        xlsName = 'dinamoto.xlsx';
    workbook.write(xlsPath.concat(xlsName));
    console.log('Products exported to the ', xlsName);
})();
