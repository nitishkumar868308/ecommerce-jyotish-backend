import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

// Ecommerce
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { TagsModule } from './tags/tags.module';
import { AttributesModule } from './attributes/attributes.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { AddressModule } from './address/address.module';
import { WalletModule } from './wallet/wallet.module';
import { OffersModule } from './offers/offers.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { ReviewsModule } from './reviews/reviews.module';
import { BlogModule } from './blog/blog.module';
import { BlogReviewsModule } from './blog-reviews/blog-reviews.module';
import { DonationsModule } from './donations/donations.module';

// Geographic & Pricing
import { GeographicModule } from './geographic/geographic.module';
import { PricingModule } from './pricing/pricing.module';
import { CountryTaxModule } from './country-tax/country-tax.module';
import { ShippingPricingModule } from './shipping-pricing/shipping-pricing.module';

// Content
import { BannersModule } from './banners/banners.module';
import { HeadersModule } from './headers/headers.module';
import { MarketLinksModule } from './market-links/market-links.module';
import { VideoStoryModule } from './video-story/video-story.module';

// Warehouse & Inventory
import { WarehouseModule } from './warehouse/warehouse.module';
import { InventoryModule } from './inventory/inventory.module';
import { SkuMappingModule } from './sku-mapping/sku-mapping.module';
import { IncreffModule } from './increff/increff.module';

// Jyotish
import { JyotishModule } from './jyotish/jyotish.module';

// Misc
import { ContactModule } from './contact/contact.module';
import { UploadModule } from './upload/upload.module';
import { DocumentsModule } from './documents/documents.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Core
    PrismaModule,
    AuthModule,

    // Ecommerce
    ProductsModule,
    CategoriesModule,
    SubcategoriesModule,
    TagsModule,
    AttributesModule,
    CartModule,
    OrdersModule,
    AddressModule,
    WalletModule,
    OffersModule,
    PromoCodesModule,
    ReviewsModule,
    BlogModule,
    BlogReviewsModule,
    DonationsModule,

    // Geographic & Pricing
    GeographicModule,
    PricingModule,
    CountryTaxModule,
    ShippingPricingModule,

    // Content
    BannersModule,
    HeadersModule,
    MarketLinksModule,
    VideoStoryModule,

    // Warehouse & Inventory
    WarehouseModule,
    InventoryModule,
    SkuMappingModule,
    IncreffModule,

    // Jyotish
    JyotishModule,

    // Misc
    MailModule,
    ContactModule,
    UploadModule,
    DocumentsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
