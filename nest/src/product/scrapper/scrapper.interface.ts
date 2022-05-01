export interface ScrapperInterface {
    startScrapping(productRow: number, productSheet: any): Promise<number>;
}
