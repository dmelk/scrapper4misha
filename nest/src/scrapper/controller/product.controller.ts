import { Controller, Post } from '@nestjs/common';
import { ProductScrapper } from '../scrapper/product.scrapper';

@Controller('/api/product')
export class ProductController {
  constructor(private readonly scrapper: ProductScrapper) {}

  @Post()
  public start() {
    this.scrapper.startScrapping();
    return {
      success: true,
    };
  }
}
