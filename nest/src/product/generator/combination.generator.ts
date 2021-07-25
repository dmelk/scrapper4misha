import {Injectable} from '@nestjs/common';

@Injectable()
export class CombinationGenerator {
    public build(list: any[], variants: any[]): any[] {
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

        return this.build(newList, variantCopy);
    }
}
