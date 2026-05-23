import { Controller, Get, Query } from '@nestjs/common';
import { StorefrontSearchQueryDto } from './dto/storefront-search.dto';
import { StorefrontSearchService } from './storefront-search.service';

@Controller('marketplace')
export class MarketplaceSearchController {
  constructor(private readonly searchService: StorefrontSearchService) {}

  /** Search products (legacy + listings), stores, and categories. */
  @Get('search')
  search(@Query() query: StorefrontSearchQueryDto) {
    return this.searchService.search(query.q, {
      page: query.page,
      limit: query.limit,
    });
  }
}
