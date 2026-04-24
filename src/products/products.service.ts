import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  CreateProductVariationDto,
  ProductMarketLinkDto,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

/**
 * City families that drive which stock table backs QuickGo. Admins enter
 * city names free-form on warehouse rows — the canonical DB value is
 * "Bengaluru" (see increff.service.ts line ~215) but older records and
 * free-typed variants spell it four different ways. Kept in sync with
 * `normalizeCity` in increff.service.ts so the two stock pipelines
 * agree on which warehouses belong to which city family.
 *
 * When a new warehouse city comes online with its own inventory source,
 * extend the matching set AND wire up the new stock resolver in
 * resolveQuickGoStockSources below.
 */
const DELHI_CITY_ALIASES = new Set(['delhi', 'new delhi']);
const BANGALORE_CITY_ALIASES = new Set([
  'bengaluru',
  'bangalore',
  'bangaluru',
  'bengalooru',
]);

/**
 * Collapse any spelling of a city to its canonical family key so two
 * warehouses saved as "Bengaluru" and "Bangalore" still group together.
 * Returns `null` for unknown cities so callers can treat those as "not
 * yet wired to a QuickGo stock source".
 */
function cityFamily(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (DELHI_CITY_ALIASES.has(s)) return 'delhi';
  if (BANGALORE_CITY_ALIASES.has(s)) return 'bangalore';
  return null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Best-effort SEO auto-fill. Admin UI hides these fields, so we populate them
 * here when missing — slug from name, meta/keywords from description + tags.
 */
function deriveSeo(
  dto: { name: string; short?: string; description?: string },
  tagNames: string[],
) {
  return {
    slug: slugify(dto.name),
    metaTitle: dto.name.slice(0, 60),
    metaDescription: (dto.short || dto.description || dto.name).slice(0, 160),
    keywords: [dto.name, ...tagNames].filter(Boolean).join(', ').slice(0, 200),
  };
}

/**
 * Flatten a variation's `attributeCombo` JSON ([{name:"Color",value:"Red"}])
 * into a single space-separated haystack string so every attribute name
 * AND value is searchable in one `includes()` test. Handles the map
 * shape admins sometimes send directly (`{Color:"Red"}`) and the name-
 * split fallback used elsewhere in the app so older rows still work.
 */
function attrComboToHaystack(combo: unknown): string {
  if (!combo) return '';
  if (Array.isArray(combo)) {
    return combo
      .map((entry) => {
        if (entry && typeof entry === 'object') {
          const name = (entry as { name?: unknown }).name ?? '';
          const value = (entry as { value?: unknown }).value ?? '';
          return `${String(name)} ${String(value)}`;
        }
        return '';
      })
      .join(' ');
  }
  if (typeof combo === 'object') {
    return Object.entries(combo as Record<string, unknown>)
      .map(([k, v]) => `${k} ${String(v ?? '')}`)
      .join(' ');
  }
  return '';
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly fullInclude = {
    variations: {
      include: { tags: true },
      // Render in the admin-configured order so the storefront picker
      // and the edit form never diverge from the drag-and-drop layout.
      orderBy: { sortOrder: 'asc' as const },
    },
    category: true,
    subcategory: true,
    offers: true,
    tags: true,
    marketLinks: true,
    primaryOffer: true,
  } satisfies Prisma.ProductInclude;

  // --------------------------------------------------
  // Create
  // --------------------------------------------------

  async create(dto: CreateProductDto) {
    const {
      variations,
      tagIds,
      offerIds,
      marketLinks,
      bulkPricingTiers,
      slug,
      metaTitle,
      metaDescription,
      keywords,
      ...productData
    } = dto;

    // Validate every SKU up front — product + each variation. If any
    // collide we surface a single 409 with the conflicting value so the
    // admin UI can show a targeted error instead of the raw Prisma stack.
    await this.ensureSkuAvailable(dto.sku, null);
    if (variations?.length) {
      const seen = new Set<string>();
      for (const v of variations) {
        if (!v.sku) continue;
        if (seen.has(v.sku)) {
          throw new ConflictException(
            `Variation SKU "${v.sku}" is repeated in this product`,
          );
        }
        seen.add(v.sku);
        await this.ensureSkuAvailable(v.sku, null);
      }
    }

    const tagNames = tagIds?.length
      ? (
          await this.prisma.tag.findMany({
            where: { id: { in: tagIds } },
            select: { name: true },
          })
        ).map((t) => t.name)
      : [];
    const seo = deriveSeo(dto, tagNames);

    try {
      return await this.prisma.product.create({
        data: {
          ...productData,
          slug: slug ?? (await this.uniqueSlug(seo.slug)),
          metaTitle: metaTitle ?? seo.metaTitle,
          metaDescription: metaDescription ?? seo.metaDescription,
          keywords: keywords ?? seo.keywords,
          bulkPricingTiers:
            bulkPricingTiers === undefined
              ? undefined
              : (bulkPricingTiers as unknown as Prisma.InputJsonValue),
          ...(variations?.length && {
            variations: {
              // Tag each variation with its array position so the list
              // renders in the creator's preferred order on reads.
              create: variations.map((v, i) => ({
                ...this.toVariationCreate(v),
                sortOrder: v.sortOrder ?? i,
              })),
            },
          }),
          ...(tagIds?.length && {
            tags: { connect: tagIds.map((id) => ({ id })) },
          }),
          ...(offerIds?.length && {
            offers: { connect: offerIds.map((id) => ({ id })) },
          }),
          ...(marketLinks?.length && {
            marketLinks: {
              create: marketLinks.map((m) => this.toMarketLinkCreate(m)),
            },
          }),
        },
        include: this.fullInclude,
      });
    } catch (err) {
      // Prisma raises `P2002` for unique-constraint violations. In practice
      // this is reached only when the admin saved concurrent rows between
      // our `ensureSkuAvailable` check and the insert — flip the 500 into
      // a friendly 409 so the UI can ask them to pick a different value.
      if (
        err &&
        typeof err === 'object' &&
        (err as { code?: string }).code === 'P2002'
      ) {
        const meta = (err as { meta?: { target?: string[] | string } }).meta;
        const targets = Array.isArray(meta?.target)
          ? meta!.target.join(', ')
          : meta?.target ?? 'sku';
        throw new ConflictException(
          `Could not save product \u2014 ${targets} already in use. ` +
            `Pick a different ${targets} and try again.`,
        );
      }
      throw err;
    }
  }

  // --------------------------------------------------
  // Read
  // --------------------------------------------------

  /**
   * Header autocomplete search — token-AND match across the product's
   * entire searchable surface: name, short, description, sku, tag
   * names, every variation's variationName + sku + attribute combo.
   *
   * Example: searching "blue female candles" tokenises to
   *   ["blue", "female", "candles"]
   * and matches the "Female Candles" product because its haystack
   * contains "Female Candles" (name) and "Blue" (variation attribute).
   * The best-matching variation is surfaced on the result so the
   * dropdown can preview "Color: Blue · Type of wax: Pureweewax".
   *
   * QuickGo aware — when `platform=quickgo` + city + pincode are
   * supplied, the candidate set is pre-filtered to locally-stocked
   * products (same stock pipeline as the listing endpoint) so results
   * the shopper can't actually buy from their location never show up.
   */
  async search(opts: {
    q: string;
    platform?: string;
    city?: string;
    pincode?: string;
    limit?: number;
    countryCode?: string;
  }) {
    const q = (opts.q ?? '').trim();
    if (!q) return { matches: [] as any[] };
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { matches: [] as any[] };
    const limit = Math.min(Math.max(opts.limit ?? 10, 1), 20);

    const andConditions: Prisma.ProductWhereInput[] = [];

    // Platform narrow. Mirror the storefront's `filterByPlatform` semantics
    // (src/lib/products.ts): a product with an empty `platform` array is
    // legacy and belongs to Wizard only. Without this the header search
    // returns "No products match" on Wizard for every legacy row because
    // `{ has: 'wizard' }` doesn't match `platform = []`.
    if (opts.platform) {
      const p = opts.platform.toLowerCase();
      if (p === 'wizard') {
        andConditions.push({
          OR: [
            { platform: { has: 'wizard' } },
            { platform: { isEmpty: true } },
          ],
        });
      } else {
        andConditions.push({ platform: { has: p } });
      }
    }

    // DB-level token pre-filter so the 200-candidate cap below doesn't
    // quietly drop the target product on catalogues larger than 200 rows.
    // Semantics: AT LEAST ONE token must appear in some plain-text field
    // (name/sku/description/short/tag/variation name+sku). We deliberately
    // don't require EVERY token here because attribute values (colors,
    // sizes) live only in variation.attributeCombo JSON which Prisma
    // can't query natively — the in-app loop below still enforces the
    // full token-AND match across the JSON-aware haystack.
    const tokenOr: Prisma.ProductWhereInput[] = [];
    for (const tok of tokens) {
      tokenOr.push(
        { name: { contains: tok, mode: 'insensitive' } },
        { sku: { contains: tok, mode: 'insensitive' } },
        { description: { contains: tok, mode: 'insensitive' } },
        { short: { contains: tok, mode: 'insensitive' } },
        { tags: { some: { name: { contains: tok, mode: 'insensitive' } } } },
        {
          variations: {
            some: { variationName: { contains: tok, mode: 'insensitive' } },
          },
        },
        {
          variations: {
            some: { sku: { contains: tok, mode: 'insensitive' } },
          },
        },
      );
    }
    andConditions.push({ OR: tokenOr });

    const where: Prisma.ProductWhereInput = {
      active: true,
      deleted: 0,
      AND: andConditions,
    };

    // QuickGo location narrow — re-use the same source resolver as the
    // listing endpoint so a product can't appear in search that's
    // unavailable in the shopper's warehouse. We track stock at the
    // VARIATION level (not just productId) so the preview surfaces a
    // variation the shopper can actually buy at their pincode — e.g.
    // the Blue variation must be hidden if only Red/White are stocked.
    const isQuickGo = (opts.platform ?? '').toLowerCase() === 'quickgo';
    const stockProductIds = new Set<string>();
    const inStockVariationIds = new Set<string>();
    // Products whose stock is attached to the MAIN SKU (no variation in
    // the warehouse row, e.g. Bangalore inventory matched on product.sku
    // not variation.sku). These surface without a variation preview.
    const mainSkuStockProductIds = new Set<string>();
    const hasQuickGoStockFilter = !!(isQuickGo && opts.city && opts.pincode);
    if (hasQuickGoStockFilter) {
      const sources = await this.resolveQuickGoStockSources(
        opts.city!,
        opts.pincode!,
      );
      if (sources.delhiWarehouseIds.length > 0) {
        const rows = await this.prisma.delhiWarehouseStock.findMany({
          where: {
            warehouseId: { in: sources.delhiWarehouseIds },
            active: true,
            deleted: false,
            stock: { gt: 0 },
          },
          select: { productId: true, variationId: true },
        });
        for (const r of rows) {
          stockProductIds.add(r.productId);
          inStockVariationIds.add(r.variationId);
        }
      }
      if (sources.bangaloreLocationCodes.length > 0) {
        const stockBySku = await this.resolveBangaloreStockBySku(
          sources.bangaloreLocationCodes,
        );
        if (stockBySku.size > 0) {
          const skus = [...stockBySku.keys()];
          const [prods, vars] = await Promise.all([
            this.prisma.product.findMany({
              where: { sku: { in: skus }, deleted: 0 },
              select: { id: true, sku: true },
            }),
            this.prisma.productVariation.findMany({
              where: { sku: { in: skus }, deleted: 0 },
              select: { id: true, productId: true, sku: true },
            }),
          ]);
          for (const p of prods) {
            const qty = stockBySku.get(p.sku) ?? 0;
            if (qty <= 0) continue;
            stockProductIds.add(p.id);
            mainSkuStockProductIds.add(p.id);
          }
          for (const v of vars) {
            const qty = stockBySku.get(v.sku) ?? 0;
            if (qty <= 0) continue;
            stockProductIds.add(v.productId);
            inStockVariationIds.add(v.id);
          }
        }
      }
      if (stockProductIds.size === 0) return { matches: [] as any[] };
      where.id = { in: [...stockProductIds] };
    }

    // Pull candidates. We fetch more than `limit` because the final
    // filter (token AND-match across the full haystack) is done in-app.
    // Cap the candidate pool so catalogues of any size stay responsive.
    const CANDIDATE_CAP = 200;
    const candidates = await this.prisma.product.findMany({
      where,
      include: {
        variations: {
          select: {
            id: true,
            variationName: true,
            sku: true,
            price: true,
            stock: true,
            image: true,
            attributeCombo: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        tags: { select: { name: true } },
      },
      take: CANDIDATE_CAP,
    });

    type Match = {
      productId: string;
      name: string;
      slug: string | null;
      image: string | null;
      price: string | null;
      currencySymbol?: string;
      variation?: {
        id: string;
        variationName: string;
        sku: string;
        image: string | null;
        attrs: Array<{ name: string; value: string }>;
      };
      score: number;
    };

    const matches: Match[] = [];

    for (const p of candidates) {
      // QuickGo stock gate: when the shopper's pincode is known, only
      // surface variations that are actually stocked at their location.
      // Products whose stock sits on the MAIN SKU (no variation row) are
      // surfaced without a variation preview. Products with neither path
      // should already have been excluded by `where.id` above, but we
      // guard here too in case the candidate fetch drifts.
      const stockFilteredVariations = hasQuickGoStockFilter
        ? (p.variations ?? []).filter((v) => inStockVariationIds.has(v.id))
        : (p.variations ?? []);
      if (
        hasQuickGoStockFilter &&
        stockFilteredVariations.length === 0 &&
        !mainSkuStockProductIds.has(p.id)
      ) {
        continue;
      }

      // Build a single lowercase haystack per variation so we can score
      // each variation independently (more tokens matched in one chunk
      // = better representative for the preview label).
      const variationHaystacks = stockFilteredVariations.map((v) => {
        const attrText = attrComboToHaystack(v.attributeCombo);
        return {
          v,
          haystack: `${v.variationName ?? ''} ${v.sku ?? ''} ${attrText}`.toLowerCase(),
        };
      });

      const tagText = (p.tags ?? []).map((t) => t.name).join(' ');
      const productOnlyHaystack = `${p.name} ${p.sku} ${p.description ?? ''} ${p.short ?? ''} ${tagText}`
        .toLowerCase();
      const fullHaystack =
        productOnlyHaystack + ' ' + variationHaystacks.map((vh) => vh.haystack).join(' ');

      // Token-AND: every token must appear somewhere on this product.
      const allMatch = tokens.every((tok) => fullHaystack.includes(tok));
      if (!allMatch) continue;

      // Pick the best variation to surface: the one whose own haystack
      // covers the most tokens. Tie → the variation the admin ordered
      // first (sortOrder already ascending from the query).
      let best: (typeof variationHaystacks)[number] | null = null;
      let bestHits = -1;
      for (const vh of variationHaystacks) {
        const hits = tokens.reduce(
          (acc, tok) => acc + (vh.haystack.includes(tok) ? 1 : 0),
          0,
        );
        if (hits > bestHits) {
          bestHits = hits;
          best = vh;
        }
      }

      // Score: token hits on product haystack + on best variation +
      // small bonus when the token matches the product name's START
      // (so "fem" surfaces "Female Candles" above a tag-only match).
      const productHits = tokens.reduce(
        (acc, tok) => acc + (productOnlyHaystack.includes(tok) ? 1 : 0),
        0,
      );
      const nameLower = p.name.toLowerCase();
      const prefixBonus = tokens.some((t) => nameLower.startsWith(t))
        ? 3
        : 0;
      const score = productHits + Math.max(0, bestHits) + prefixBonus;

      const parseAttrs = (
        combo: unknown,
      ): Array<{ name: string; value: string }> => {
        if (!combo) return [];
        if (Array.isArray(combo)) {
          return combo
            .map((e) =>
              e && typeof e === 'object'
                ? {
                    name: String((e as any).name ?? ''),
                    value: String((e as any).value ?? ''),
                  }
                : { name: '', value: '' },
            )
            .filter((x) => x.name && x.value);
        }
        if (typeof combo === 'object') {
          return Object.entries(combo as Record<string, unknown>).map(
            ([k, v]) => ({ name: k, value: String(v ?? '') }),
          );
        }
        return [];
      };

      matches.push({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        image: Array.isArray(p.image) ? p.image[0] ?? null : null,
        price: best?.v.price ?? p.price ?? null,
        variation: best
          ? {
              id: best.v.id,
              variationName: best.v.variationName ?? '',
              sku: best.v.sku ?? '',
              image: Array.isArray(best.v.image) ? best.v.image[0] ?? null : null,
              attrs: parseAttrs(best.v.attributeCombo),
            }
          : undefined,
        score,
      });
    }

    matches.sort((a, b) => b.score - a.score);
    const trimmed = matches.slice(0, limit);

    // Country pricing — reuse the existing helper so the dropdown price
    // matches the PDP after conversion.
    if (opts.countryCode) {
      const minimal = trimmed.map((m) => ({ price: m.price }));
      const priced = await this.applyCountryPricing(minimal as any[], opts.countryCode);
      trimmed.forEach((m, i) => {
        m.price = (priced[i] as any)?.price ?? m.price;
        m.currencySymbol = (priced[i] as any)?.currencySymbol ?? undefined;
      });
    }

    return { matches: trimmed };
  }

  async findAllActive(countryCode?: string) {
    const products = await this.prisma.product.findMany({
      where: { active: true, deleted: 0 },
      include: this.fullInclude,
    });
    return this.applyCountryPricing(products, countryCode);
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { deleted: 0 },
      include: this.fullInclude,
    });
  }

  async findOne(
    idOrSlug: string,
    countryCode?: string,
    quickGo?: { city?: string; pincode?: string },
  ) {
    let product = await this.prisma.product.findUnique({
      where: { id: idOrSlug },
      include: this.fullInclude,
    });
    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { slug: idOrSlug },
        include: this.fullInclude,
      });
    }
    if (!product || product.deleted === 1) {
      throw new NotFoundException('Product not found');
    }
    const [scoped] = await this.applyCountryPricing([product], countryCode);

    // QuickGo: narrow variations to whatever the selected city+pincode
    // warehouse stocks. Combines two stock sources based on the effective
    // fulfillment warehouse's city — DelhiWarehouseStock (keyed by
    // warehouseId) for Delhi, BangaloreIncreffInventory + MappingSKU
    // (keyed by locationCode = warehouse.code) for Bangalore. Any
    // variation not stocked locally is dropped so the storefront picker
    // never offers something that can't ship from this location.
    if (quickGo?.city && quickGo?.pincode) {
      const platformOk = Array.isArray((scoped as any).platform)
        ? (scoped as any).platform
            .map((p: string) => p.toLowerCase())
            .includes('quickgo')
        : false;
      if (!platformOk) {
        throw new NotFoundException('Product not available on QuickGo');
      }

      const sources = await this.resolveQuickGoStockSources(
        quickGo.city,
        quickGo.pincode,
      );
      const stockByVariation = await this.collectQuickGoVariationStock(
        scoped.id,
        (scoped as any).sku,
        (scoped as any).variations ?? [],
        sources,
      );

      // Drop variations that aren't in the stock map, and overwrite each
      // surviving variation's `stock` with the aggregated per-location
      // count so the UI renders the right "Only N left" badge.
      const filteredVariations = ((scoped as any).variations ?? [])
        .filter((v: any) => stockByVariation.has(v.id))
        .map((v: any) => ({
          ...v,
          stock: String(stockByVariation.get(v.id) ?? 0),
        }));
      (scoped as any).variations = filteredVariations;

      const productTotal = Array.from(stockByVariation.values()).reduce(
        (a, b) => a + b,
        0,
      );
      (scoped as any).quickgoStock = productTotal;

      // If the only match was at the main product SKU level (no variation
      // match) we still show the product — variations array simply ends
      // up empty which the detail UI treats as a no-variation product.
      // If NOTHING matched and nothing is stocked, tell the caller: no
      // product for this location.
      if (productTotal === 0) {
        throw new NotFoundException('Product not stocked in this location');
      }
    }

    return scoped;
  }

  /**
   * Resolve the stock sources the shopper's location maps to.
   *
   * Steps:
   *   1. Find every active WareHouse whose `pincode` CSV contains the
   *      selected pincode.
   *   2. For each match, compute the "effective fulfillment warehouse":
   *      `fulfillmentWarehouse` if set, otherwise self. This is what
   *      routes Faridabad pincodes under "Delhi" when Faridabad is
   *      fulfilled from the Delhi warehouse.
   *   3. Keep only rows whose effective fulfillment city equals the
   *      selected city.
   *   4. Bucket the effective warehouses by city family:
   *        - Delhi  → DelhiWarehouseStock (by warehouseId)
   *        - Bangalore → BangaloreIncreffInventory (by locationCode=code)
   *
   * Returns `{ delhiWarehouseIds, bangaloreLocationCodes }`. Either can
   * be empty; both empty means the location has no mapped stock and the
   * caller should treat the product as unavailable.
   */
  private async resolveQuickGoStockSources(
    city: string,
    pincode: string,
  ): Promise<{
    delhiWarehouseIds: number[];
    bangaloreLocationCodes: string[];
  }> {
    const wantFamily = cityFamily(city);
    const wantPincode = pincode.trim();
    // Unknown city family = no stock source wired in yet, and 6-digit
    // pincode is required so we don't accidentally match on a partial
    // number.
    if (!wantFamily || !/^\d{6}$/.test(wantPincode)) {
      return { delhiWarehouseIds: [], bangaloreLocationCodes: [] };
    }

    // Pull every candidate warehouse — we need the full set so we can
    // resolve fulfillment relationships in-app without N+1 queries.
    // Schema isn't huge; a single pass is fine.
    const warehouses = await this.prisma.wareHouse.findMany({
      where: { active: true, deleted: false },
      select: {
        id: true,
        city: true,
        code: true,
        pincode: true,
        fulfillmentWarehouseId: true,
      },
    });

    const byId = new Map<number, (typeof warehouses)[number]>();
    for (const w of warehouses) byId.set(w.id, w);

    const delhiWarehouseIds = new Set<number>();
    const bangaloreLocationCodes = new Set<string>();

    for (const w of warehouses) {
      const tokens = (w.pincode ?? '')
        .split(/[^0-9]+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (!tokens.includes(wantPincode)) continue;

      // Effective fulfillment warehouse — self if no explicit pointer,
      // or follow one hop. (We don't recurse deeper: fulfillment chains
      // are admin-configured and expected to be flat.)
      const fw = w.fulfillmentWarehouseId
        ? byId.get(w.fulfillmentWarehouseId) ?? w
        : w;
      // Compare by city FAMILY so "Bengaluru"/"Bangalore"/"Bangaluru"
      // all collapse together — the admin's spelling shouldn't break
      // the stock lookup.
      if (cityFamily(fw.city) !== wantFamily) continue;

      if (wantFamily === 'delhi') {
        delhiWarehouseIds.add(fw.id);
      } else if (wantFamily === 'bangalore' && fw.code) {
        bangaloreLocationCodes.add(fw.code);
      }
    }

    return {
      delhiWarehouseIds: [...delhiWarehouseIds],
      bangaloreLocationCodes: [...bangaloreLocationCodes],
    };
  }

  /**
   * Compute per-variation stock for a given product from the QuickGo
   * stock sources. Returns a Map of variationId → aggregated stock.
   *
   * Delhi path: DelhiWarehouseStock rows indexed by variationId.
   * Bangalore path: BangaloreIncreffInventory rows → MappingSKU lookup
   *   (per-location override wins over global) → ourSku matched against
   *   this product's variation SKUs (or main product SKU). Only matched
   *   SKUs contribute stock; unmapped rows are ignored entirely so the
   *   product doesn't show up when no mapping exists.
   */
  private async collectQuickGoVariationStock(
    productId: string,
    productSku: string | null | undefined,
    variations: Array<{ id: string; sku: string | null }>,
    sources: {
      delhiWarehouseIds: number[];
      bangaloreLocationCodes: string[];
    },
  ): Promise<Map<string, number>> {
    const stockByVariation = new Map<string, number>();

    if (sources.delhiWarehouseIds.length > 0) {
      const rows = await this.prisma.delhiWarehouseStock.findMany({
        where: {
          productId,
          warehouseId: { in: sources.delhiWarehouseIds },
          active: true,
          deleted: false,
          stock: { gt: 0 },
        },
        select: { variationId: true, stock: true },
      });
      for (const row of rows) {
        if (!row.variationId) continue;
        stockByVariation.set(
          row.variationId,
          (stockByVariation.get(row.variationId) ?? 0) + row.stock,
        );
      }
    }

    if (sources.bangaloreLocationCodes.length > 0) {
      const skuToVariationId = new Map<string, string>();
      for (const v of variations) {
        if (v.sku) skuToVariationId.set(v.sku, v.id);
      }
      const bangaloreStockBySku = await this.resolveBangaloreStockBySku(
        sources.bangaloreLocationCodes,
      );
      for (const [ourSku, qty] of bangaloreStockBySku) {
        const vid = skuToVariationId.get(ourSku);
        if (vid) {
          stockByVariation.set(vid, (stockByVariation.get(vid) ?? 0) + qty);
        } else if (productSku && ourSku === productSku) {
          // Main product SKU match — record under a synthetic key so the
          // listing path can still see "this product has stock" without
          // injecting a fake variation into the detail payload.
          stockByVariation.set(
            '__main__',
            (stockByVariation.get('__main__') ?? 0) + qty,
          );
        }
      }
    }

    return stockByVariation;
  }

  /**
   * Resolve Bangalore inventory → ourSku → stock. Walks
   * BangaloreIncreffInventory for the given locationCodes, joins each
   * row to its MappingSKU (per-location override wins over the global
   * null-location mapping), and returns `Map<ourSku, totalQuantity>`.
   * Rows without any mapping are dropped — the user's rule: no mapping,
   * no product.
   */
  private async resolveBangaloreStockBySku(
    locationCodes: string[],
  ): Promise<Map<string, number>> {
    if (locationCodes.length === 0) return new Map();

    const inventory = await this.prisma.bangaloreIncreffInventory.findMany({
      where: { locationCode: { in: locationCodes }, quantity: { gt: 0 } },
      select: {
        locationCode: true,
        channelSkuCode: true,
        quantity: true,
      },
    });
    if (inventory.length === 0) return new Map();

    const channelSkus = [...new Set(inventory.map((i) => i.channelSkuCode))];
    const mappings = await this.prisma.bangaloreIncreffMappingSKU.findMany({
      where: { channelSku: { in: channelSkus } },
      select: { channelSku: true, ourSku: true, locationCode: true },
    });

    // Per-location override wins over the global null-location mapping.
    const overrideByKey = new Map<string, string>(); // `${channelSku}::${loc}` → ourSku
    const globalByChannel = new Map<string, string>();
    for (const m of mappings) {
      if (m.locationCode == null) {
        globalByChannel.set(m.channelSku, m.ourSku);
      } else {
        overrideByKey.set(`${m.channelSku}::${m.locationCode}`, m.ourSku);
      }
    }

    const bySku = new Map<string, number>();
    for (const inv of inventory) {
      const ourSku =
        overrideByKey.get(`${inv.channelSkuCode}::${inv.locationCode}`) ??
        globalByChannel.get(inv.channelSkuCode) ??
        null;
      if (!ourSku) continue;
      bySku.set(ourSku, (bySku.get(ourSku) ?? 0) + inv.quantity);
    }
    return bySku;
  }

  async findAllPaginated(
    page: number,
    limit: number,
    filters?: {
      categoryId?: string;
      subcategoryId?: string;
      search?: string;
      tags?: string;
      minPrice?: string;
      maxPrice?: string;
      sortBy?: string;
      sortOrder?: string;
      letter?: string;
      platform?: string;
      city?: string;
      pincode?: string;
      countryCode?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = { active: true, deleted: 0 };

    if (filters?.categoryId)
      where.categoryId = parseInt(filters.categoryId, 10);
    if (filters?.subcategoryId)
      where.subcategoryId = parseInt(filters.subcategoryId, 10);
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.tags) {
      const tagNames = filters.tags.split(',').map((t) => t.trim());
      where.tags = { some: { name: { in: tagNames } } };
    }
    if (filters?.minPrice) {
      where.price = { ...(where.price as object), gte: filters.minPrice };
    }
    if (filters?.maxPrice) {
      where.price = { ...(where.price as object), lte: filters.maxPrice };
    }
    if (filters?.letter)
      where.name = { startsWith: filters.letter, mode: 'insensitive' };

    // Platform filter — products have a `platform` string[] column; match
    // any product that lists the requested surface.
    if (filters?.platform) {
      const p = filters.platform.toLowerCase();
      (where as any).platform = { has: p };
    }

    // QuickGo city+pincode filter — listing is restricted to products
    // that (a) are opted into the QuickGo surface AND (b) have stock in
    // the effective fulfillment warehouse for the shopper's location.
    // We resolve stock through two parallel sources depending on the
    // fulfillment city: DelhiWarehouseStock for Delhi, Bangalore Increff
    // inventory+mapping for Bangalore. Product list is the union of
    // productIds that show up in either. When both are empty, we return
    // an empty page — the shopper's city/pincode has no local stock.
    const isQuickGo =
      (filters?.platform ?? '').toLowerCase() === 'quickgo';
    const quickGoStockByProduct = new Map<string, number>();
    if (isQuickGo && filters?.city && filters?.pincode) {
      const sources = await this.resolveQuickGoStockSources(
        filters.city,
        filters.pincode,
      );

      // Delhi path: one query gives us productId + stock directly.
      if (sources.delhiWarehouseIds.length > 0) {
        const rows = await this.prisma.delhiWarehouseStock.findMany({
          where: {
            warehouseId: { in: sources.delhiWarehouseIds },
            active: true,
            deleted: false,
            stock: { gt: 0 },
          },
          select: { productId: true, stock: true },
        });
        for (const r of rows) {
          quickGoStockByProduct.set(
            r.productId,
            (quickGoStockByProduct.get(r.productId) ?? 0) + r.stock,
          );
        }
      }

      // Bangalore path: resolve ourSku → quantity, then translate SKUs
      // back to productIds via Product.sku (main) and
      // ProductVariation.sku. Unmapped rows are already dropped inside
      // resolveBangaloreStockBySku so they can't leak in here.
      if (sources.bangaloreLocationCodes.length > 0) {
        const stockBySku = await this.resolveBangaloreStockBySku(
          sources.bangaloreLocationCodes,
        );
        if (stockBySku.size > 0) {
          const skus = [...stockBySku.keys()];
          const [productMatches, variationMatches] = await Promise.all([
            this.prisma.product.findMany({
              where: { sku: { in: skus }, deleted: 0 },
              select: { id: true, sku: true },
            }),
            this.prisma.productVariation.findMany({
              where: { sku: { in: skus }, deleted: 0 },
              select: { productId: true, sku: true },
            }),
          ]);
          for (const p of productMatches) {
            const qty = stockBySku.get(p.sku) ?? 0;
            if (qty <= 0) continue;
            quickGoStockByProduct.set(
              p.id,
              (quickGoStockByProduct.get(p.id) ?? 0) + qty,
            );
          }
          for (const v of variationMatches) {
            const qty = stockBySku.get(v.sku) ?? 0;
            if (qty <= 0) continue;
            quickGoStockByProduct.set(
              v.productId,
              (quickGoStockByProduct.get(v.productId) ?? 0) + qty,
            );
          }
        }
      }

      const ids = [...quickGoStockByProduct.keys()];
      if (ids.length === 0) {
        return {
          products: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
      where.id = { in: ids };
    } else if (isQuickGo) {
      // Platform is QuickGo but no location selected — shouldn't normally
      // happen (modal enforces selection) but fall through to platform
      // filter alone so an admin preview still renders products.
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (filters?.sortBy) {
      const order = filters.sortOrder === 'asc' ? 'asc' : 'desc';
      if (filters.sortBy === 'price') orderBy = { price: order };
      else if (filters.sortBy === 'name') orderBy = { name: order };
      else if (filters.sortBy === 'createdAt') orderBy = { createdAt: order };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.fullInclude,
      }),
      this.prisma.product.count({ where }),
    ]);

    const scoped = await this.applyCountryPricing(products, filters?.countryCode);

    // Inject aggregated QuickGo stock onto each product so the card can
    // render the "In stock · N" / "Only N left" badge without a second
    // round-trip. Non-QuickGo callers get products untouched.
    const decorated = quickGoStockByProduct.size
      ? scoped.map((p) => ({
          ...p,
          quickgoStock: quickGoStockByProduct.get((p as any).id) ?? 0,
        }))
      : scoped;

    return {
      products: decorated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // --------------------------------------------------
  // Update
  // --------------------------------------------------

  async update(dto: UpdateProductDto) {
    const {
      id,
      variations,
      tagIds,
      offerIds,
      marketLinks,
      bulkPricingTiers,
      sku,
      ...productData
    } = dto;

    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    if (sku && sku !== existing.sku) {
      await this.ensureSkuAvailable(sku, id);
    }

    // Pre-validate variation SKUs before we touch the DB so the admin gets
    // a clean 409 instead of a surprise P2002 mid-transaction.
    if (variations) {
      const seen = new Set<string>();
      for (const v of variations) {
        if (!v.sku) continue;
        if (seen.has(v.sku)) {
          throw new ConflictException(
            `Duplicate variation SKU "${v.sku}" in payload`,
          );
        }
        seen.add(v.sku);
        // If the SKU belongs to a variation on ANOTHER product (or a
        // product SKU unrelated to this one) we can't use it. Our own
        // variations are fine — they'll be dropped before the new batch
        // is written inside the transaction below.
        const productHit = await this.prisma.product.findUnique({
          where: { sku: v.sku },
          select: { id: true },
        });
        if (productHit && productHit.id !== id) {
          throw new ConflictException(
            `SKU "${v.sku}" is already in use by another product`,
          );
        }
        const varHit = await this.prisma.productVariation.findUnique({
          where: { sku: v.sku },
          select: { productId: true },
        });
        if (varHit && varHit.productId !== id) {
          throw new ConflictException(
            `SKU "${v.sku}" is already in use by another variation`,
          );
        }
      }
    }

    // Upsert variations by SKU so matched rows keep their existing ID —
    // this is important because the shopper's Cart rows reference a
    // `variationId`. If we were to delete+recreate every variation on an
    // attribute tweak, the cart lines would point at deleted rows and the
    // product detail page would lose track of which variations are
    // already in the cart (the user's "Add to cart" re-appearing bug).
    return this.prisma.$transaction(async (tx) => {
      if (variations) {
        const existing = await tx.productVariation.findMany({
          where: { productId: id },
          select: { id: true, sku: true },
        });
        const existingBySku = new Map(existing.map((v) => [v.sku, v]));
        const incomingSkus = new Set(
          variations.map((v) => v.sku).filter(Boolean),
        );

        // Remove variations that are no longer in the payload.
        const toDelete = existing.filter((v) => !incomingSkus.has(v.sku));
        if (toDelete.length > 0) {
          await tx.productVariation.deleteMany({
            where: { id: { in: toDelete.map((v) => v.id) } },
          });
        }

        // Upsert each incoming variation: update-by-sku if we already have
        // one, otherwise create a fresh row under this product. `sortOrder`
        // comes from the array position so the admin's drag-and-drop in
        // the form persists verbatim — storefront reads use
        // `orderBy: { sortOrder }` to render in the same order.
        for (let i = 0; i < variations.length; i++) {
          const v = variations[i];
          const sortOrder = v.sortOrder ?? i;
          const match = existingBySku.get(v.sku);
          if (match) {
            await tx.productVariation.update({
              where: { id: match.id },
              data: { ...this.toVariationUpdate(v), sortOrder },
            });
          } else {
            await tx.productVariation.create({
              data: {
                ...this.toVariationCreate(v),
                sortOrder,
                product: { connect: { id } },
              },
            });
          }
        }
      }

      if (marketLinks) {
        await tx.marketLink.deleteMany({ where: { productId: id } });
      }

      return tx.product.update({
        where: { id },
        data: {
          ...productData,
          ...(sku !== undefined && { sku }),
          ...(bulkPricingTiers !== undefined && {
            bulkPricingTiers:
              bulkPricingTiers as unknown as Prisma.InputJsonValue,
          }),
          ...(tagIds && {
            tags: { set: tagIds.map((tagId) => ({ id: tagId })) },
          }),
          ...(offerIds && {
            offers: { set: offerIds.map((offerId) => ({ id: offerId })) },
          }),
          ...(marketLinks && {
            marketLinks: {
              create: marketLinks.map((m) => this.toMarketLinkCreate(m)),
            },
          }),
        },
        include: this.fullInclude,
      });
    });
  }

  // --------------------------------------------------
  // Delete / toggle
  // --------------------------------------------------

  async softDelete(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id },
      data: { deleted: 1 },
    });
  }

  async toggleActive(id: string, active: boolean) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { active } });
  }

  async deleteVariation(variationId: string) {
    const existing = await this.prisma.productVariation.findUnique({
      where: { id: variationId },
    });
    if (!existing) throw new NotFoundException('Variation not found');
    return this.prisma.productVariation.delete({ where: { id: variationId } });
  }

  // --------------------------------------------------
  // Utility (public — used by controller for sku check)
  // --------------------------------------------------

  async isSkuAvailable(sku: string, ignoreId?: string) {
    const hit = await this.prisma.product.findUnique({ where: { sku } });
    if (!hit) {
      const vHit = await this.prisma.productVariation.findUnique({
        where: { sku },
      });
      return !vHit;
    }
    if (ignoreId && hit.id === ignoreId) return true;
    return false;
  }

  // --------------------------------------------------
  // Internal helpers
  // --------------------------------------------------

  private async ensureSkuAvailable(sku: string, ignoreId: string | null) {
    const ok = await this.isSkuAvailable(sku, ignoreId ?? undefined);
    if (!ok) throw new ConflictException(`SKU "${sku}" is already in use`);
  }

  private async uniqueSlug(base: string): Promise<string> {
    if (!base) return `product-${Date.now()}`;
    let candidate = base;
    let n = 1;
    while (true) {
      const taken = await this.prisma.product.findUnique({
        where: { slug: candidate },
      });
      if (!taken) return candidate;
      n += 1;
      candidate = `${base}-${n}`;
      if (n > 50) return `${base}-${Date.now()}`;
    }
  }

  private toVariationCreate(
    v: CreateProductVariationDto,
  ): Prisma.ProductVariationCreateWithoutProductInput {
    const { tagIds, attributeCombo, bulkPricingTiers, offerId, ...rest } = v;
    return {
      ...rest,
      bulkPricingTiers: bulkPricingTiers
        ? (bulkPricingTiers as unknown as Prisma.InputJsonValue)
        : undefined,
      attributeCombo: attributeCombo
        ? (attributeCombo as unknown as Prisma.InputJsonValue)
        : undefined,
      // Prisma's checked `Create…Input` doesn't accept the scalar FK
      // directly — it wants the nested relation form. Map `offerId` over
      // to `offer: { connect }` so the admin form keeps sending the
      // flat numeric id.
      ...(offerId != null && {
        offer: { connect: { id: offerId } },
      }),
      ...(tagIds?.length && {
        tags: { connect: tagIds.map((id) => ({ id })) },
      }),
    };
  }

  /**
   * Produces an `UpdateWithoutProductInput` that fully reflects the admin's
   * variation form, including relation replacement:
   *   - `tags: { set: [...] }` replaces the tag list (not appends)
   *   - `offer: connect | disconnect` handles adding AND clearing an offer
   */
  private toVariationUpdate(
    v: CreateProductVariationDto,
  ): Prisma.ProductVariationUpdateWithoutProductInput {
    const { tagIds, attributeCombo, bulkPricingTiers, offerId, ...rest } = v;
    return {
      ...rest,
      bulkPricingTiers:
        bulkPricingTiers !== undefined
          ? (bulkPricingTiers as unknown as Prisma.InputJsonValue)
          : undefined,
      attributeCombo:
        attributeCombo !== undefined
          ? (attributeCombo as unknown as Prisma.InputJsonValue)
          : undefined,
      offer:
        offerId != null
          ? { connect: { id: offerId } }
          : { disconnect: true },
      tags: { set: (tagIds ?? []).map((id) => ({ id })) },
    };
  }

  private toMarketLinkCreate(
    m: ProductMarketLinkDto,
  ): Prisma.MarketLinkCreateWithoutProductInput {
    return {
      name: m.name,
      url: m.url,
      countryName: m.countryName,
      countryCode: m.countryCode,
    };
  }

  private async applyCountryPricing<T extends { price: string | null; variations?: Array<{ price: string | null }> }>(
    products: T[],
    countryCode?: string,
  ): Promise<any[]> {
    if (!countryCode) return products as unknown as any[];
    const cp = await this.prisma.countryPricing.findUnique({
      where: { code: countryCode },
    });
    if (!cp?.multiplier) return products as unknown as any[];
    const rate = (cp.conversionRate ?? 1) * cp.multiplier;
    return products.map((p) => {
      const converted: any = {
        ...p,
        price: p.price ? (parseFloat(p.price) * rate).toFixed(2) : p.price,
        currency: cp.currency,
        currencySymbol: cp.currencySymbol,
      };
      if (Array.isArray(p.variations)) {
        converted.variations = p.variations.map((v) => ({
          ...v,
          price: v.price ? (parseFloat(v.price) * rate).toFixed(2) : v.price,
        }));
      }
      return converted;
    });
  }
}
