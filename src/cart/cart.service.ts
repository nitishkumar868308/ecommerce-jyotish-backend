import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCartDto, UpdateCartDto } from './dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const cartItems = await this.prisma.cart.findMany({
      where: { is_buy: false },
    });

    if (cartItems.length === 0) return [];

    // Collect unique productIds
    const productIds = [...new Set(cartItems.map((item) => item.productId))];

    // Fetch products with offers and variations
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        offers: true,
        primaryOffer: true,
        variations: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Group cart items for rangeBuyXGetY: same productId + same non-color attributes
    const offerGroups = new Map<string, typeof cartItems>();

    for (const item of cartItems) {
      const attrs = (item.attributes || {}) as Record<string, string>;
      // Build group key: productId + all non-color attributes sorted
      const nonColorAttrs = Object.entries(attrs)
        .filter(([key]) => key.toLowerCase() !== 'color')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
      const groupKey = `${item.productId}::${nonColorAttrs}`;

      if (!offerGroups.has(groupKey)) {
        offerGroups.set(groupKey, []);
      }
      offerGroups.get(groupKey)!.push(item);
    }

    // Calculate free items per group
    const freeQtyPerItem = new Map<string, number>();
    const offerSummaryMap = new Map<
      string,
      {
        offerName: string;
        totalQty: number;
        freeQty: number;
        claimed: boolean;
        offerId: number;
        start: number;
        end: number;
      }
    >();

    for (const [groupKey, groupItems] of offerGroups) {
      const productId = groupKey.split('::')[0];
      const product = productMap.get(productId);
      if (!product) continue;

      // Find rangeBuyXGetY offer (deduplicate by id)
      const seenOfferIds = new Set<number>();
      const allOffers = [];
      if (product.primaryOffer) {
        seenOfferIds.add(product.primaryOffer.id);
        allOffers.push(product.primaryOffer);
      }
      for (const o of product.offers || []) {
        if (!seenOfferIds.has(o.id)) {
          seenOfferIds.add(o.id);
          allOffers.push(o);
        }
      }

      const rangeOffer = allOffers.find(
        (o) =>
          o.discountType === 'rangeBuyXGetY' && o.active && o.deleted === 0,
      );

      if (!rangeOffer) continue;

      const discountValue = rangeOffer.discountValue as {
        start?: number;
        end?: number;
        free?: number;
      };
      const { start = 0, end = Infinity, free = 0 } = discountValue;

      const totalQty = groupItems.reduce((sum, item) => sum + item.quantity, 0);

      if (totalQty >= start && totalQty <= end && free > 0) {
        // Expand items into individual units
        const units: { cartItemId: string; price: number; createdAt: Date }[] =
          [];
        for (const item of groupItems) {
          for (let i = 0; i < item.quantity; i++) {
            units.push({
              cartItemId: item.id,
              price: item.pricePerItem,
              createdAt: item.createdAt,
            });
          }
        }

        // Sort: cheapest first, then latest createdAt first (for same price)
        units.sort((a, b) => {
          if (a.price !== b.price) return a.price - b.price;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

        // Count free units per cart item
        for (let i = 0; i < Math.min(free, units.length); i++) {
          const id = units[i].cartItemId;
          freeQtyPerItem.set(id, (freeQtyPerItem.get(id) || 0) + 1);
        }

        // Store offer summary for each item in this group
        for (const item of groupItems) {
          offerSummaryMap.set(item.id, {
            offerName: rangeOffer.name,
            totalQty,
            freeQty: free,
            claimed: true,
            offerId: rangeOffer.id,
            start,
            end,
          });
        }
      } else if (totalQty < start) {
        // Offer exists but not yet reached — show "Need X more"
        for (const item of groupItems) {
          offerSummaryMap.set(item.id, {
            offerName: rangeOffer.name,
            totalQty,
            freeQty: free,
            claimed: false,
            offerId: rangeOffer.id,
            start,
            end,
          });
        }
      }
      // If totalQty > end (e.g. moved to bulk range), don't set offer summary at all
    }

    // Pre-compute group totals for bulk (same groups as offers: color ignored)
    const bulkGroupTotals = new Map<string, number>();
    const itemToBulkGroup = new Map<string, string>();
    for (const [groupKey, groupItems] of offerGroups) {
      const total = groupItems.reduce((sum, i) => sum + i.quantity, 0);
      bulkGroupTotals.set(groupKey, total);
      for (const i of groupItems) {
        itemToBulkGroup.set(i.id, groupKey);
      }
    }

    // Enrich cart items
    return cartItems.map((item) => {
      const product = productMap.get(item.productId);

      // Bulk: always use product-level bulkPrice & minQuantity (not variation)
      const bulkPrice = product?.bulkPrice ? Number(product.bulkPrice) : null;
      const bulkMinQty = product?.minQuantity
        ? Number(product.minQuantity)
        : null;

      // Bulk applies on group total (color ignored, same as offer groups)
      const gKey = itemToBulkGroup.get(item.id) || '';
      const gTotal = bulkGroupTotals.get(gKey) || item.quantity;
      const bulkApplied = !!(bulkPrice && bulkMinQty && gTotal >= bulkMinQty);

      const effectivePrice = bulkApplied ? bulkPrice : item.pricePerItem;

      // Free item info
      const freeQtyInThisItem = freeQtyPerItem.get(item.id) || 0;
      const offerSummary = offerSummaryMap.get(item.id) || null;

      // Recalculate totalPrice: only charge for paid units
      const paidQty = Math.max(0, item.quantity - freeQtyInThisItem);
      const calculatedTotalPrice = paidQty * effectivePrice;

      return {
        ...item,
        effectivePrice,
        bulkApplied,
        isFreeItem: freeQtyInThisItem > 0 && freeQtyInThisItem >= item.quantity,
        freeQtyInThisItem,
        paidQty,
        totalPrice: calculatedTotalPrice,
        offerSummary,
      };
    });
  }

  async create(dto: CreateCartDto) {
    // Match by ALL attributes (including color) so different colors stay separate
    const attrs = (dto.attributes || {}) as Record<string, string>;

    if (dto.userId) {
      const existingItems = await this.prisma.cart.findMany({
        where: {
          productId: dto.productId,
          userId: dto.userId,
          is_buy: false,
        },
      });

      const match = existingItems.find((item) => {
        const itemAttrs = (item.attributes || {}) as Record<string, string>;
        const keys1 = Object.keys(attrs).sort();
        const keys2 = Object.keys(itemAttrs).sort();
        if (keys1.length !== keys2.length) return false;
        return keys1.every(
          (k, i) => k === keys2[i] && attrs[k] === itemAttrs[k],
        );
      });

      if (match) {
        const newQty = match.quantity + dto.quantity;
        return this.prisma.cart.update({
          where: { id: match.id },
          data: {
            quantity: newQty,
            totalPrice: dto.pricePerItem * newQty,
          },
        });
      }
    }

    return this.prisma.cart.create({
      data: dto,
    });
  }

  async update(dto: UpdateCartDto) {
    const { id, ...data } = dto;

    const cart = await this.prisma.cart.findUnique({ where: { id } });
    if (!cart) {
      throw new NotFoundException(`Cart item with id ${id} not found`);
    }

    return this.prisma.cart.update({
      where: { id },
      data,
    });
  }

  async delete(body: {
    id?: string | string[];
    clearAll?: boolean;
    userId?: number;
  }) {
    const { id, clearAll, userId } = body;

    if (clearAll && userId) {
      return this.prisma.cart.deleteMany({
        where: { userId },
      });
    }

    if (clearAll) {
      return this.prisma.cart.deleteMany();
    }

    if (Array.isArray(id)) {
      return this.prisma.cart.deleteMany({
        where: { id: { in: id } },
      });
    }

    if (id) {
      return this.prisma.cart.delete({
        where: { id },
      });
    }

    throw new NotFoundException('Provide id or clearAll flag');
  }
}
