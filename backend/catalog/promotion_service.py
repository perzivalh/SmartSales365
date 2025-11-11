from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, Iterable, Sequence

from django.db.models import Q
from django.utils import timezone

from .models import Product, Promotion


DecimalLike = Decimal | int | float


@dataclass
class PromotionPricing:
    promotion: Promotion
    discount_per_unit: Decimal
    final_price: Decimal

    def as_public_dict(self) -> dict:
        return {
            "id": str(self.promotion.id),
            "name": self.promotion.name,
            "discount_type": self.promotion.discount_type,
            "discount_value": str(self.promotion.discount_value),
            "scope": self.promotion.scope,
            "description": self.promotion.description,
            "start_date": self.promotion.start_date.isoformat() if self.promotion.start_date else None,
            "end_date": self.promotion.end_date.isoformat() if self.promotion.end_date else None,
            "discount_amount": str(self.discount_per_unit),
            "final_price": str(self.final_price),
        }


def _calculate_discount(unit_price: Decimal, promotion: Promotion) -> Decimal:
    if unit_price <= 0:
        return Decimal("0.00")
    value = Decimal(promotion.discount_value)
    if promotion.discount_type == Promotion.DiscountType.PERCENT:
        discount = (unit_price * value) / Decimal("100")
    else:
        discount = value
    if discount < 0:
        discount = Decimal("0.00")
    if discount > unit_price:
        discount = unit_price
    return discount.quantize(Decimal("0.01"))


def _gather_candidates(
    promotions: Sequence[Promotion],
) -> tuple[list[Promotion], Dict[str, list[Promotion]], Dict[str, list[Promotion]]]:
    global_promotions: list[Promotion] = []
    category_map: Dict[str, list[Promotion]] = defaultdict(list)
    product_map: Dict[str, list[Promotion]] = defaultdict(list)

    for promotion in promotions:
        if promotion.scope == Promotion.Scope.GLOBAL:
            global_promotions.append(promotion)
        elif promotion.scope == Promotion.Scope.CATEGORY:
            for category in promotion.categories.all():
                category_map[str(category.id)].append(promotion)
        elif promotion.scope == Promotion.Scope.PRODUCT:
            for product in promotion.products.all():
                product_map[str(product.id)].append(promotion)
    return global_promotions, category_map, product_map


def _select_best_promotion(
    product: Product,
    candidates: Iterable[Promotion],
) -> PromotionPricing | None:
    best: PromotionPricing | None = None
    scope_priority = {
        Promotion.Scope.PRODUCT: 0,
        Promotion.Scope.CATEGORY: 1,
        Promotion.Scope.GLOBAL: 2,
    }
    unit_price = Decimal(product.price)
    for promotion in candidates:
        discount = _calculate_discount(unit_price, promotion)
        if discount <= 0:
            continue
        final_price = unit_price - discount
        pricing = PromotionPricing(
            promotion=promotion,
            discount_per_unit=discount,
            final_price=final_price,
        )
        if best is None:
            best = pricing
            continue
        if pricing.discount_per_unit > best.discount_per_unit:
            best = pricing
            continue
        if pricing.discount_per_unit == best.discount_per_unit:
            if scope_priority[promotion.scope] < scope_priority[best.promotion.scope]:
                best = pricing
    return best


def build_promotion_pricing_map(products: Iterable[Product], moment=None) -> dict[str, PromotionPricing]:
    product_list = list(products)
    if not product_list:
        return {}

    now = moment or timezone.now()
    product_ids = [product.id for product in product_list]
    category_ids = {product.category_id for product in product_list if product.category_id}

    promotions = (
        Promotion.objects.filter(is_active=True)
        .filter(Q(start_date__lte=now) | Q(start_date__isnull=True))
        .filter(Q(end_date__gte=now) | Q(end_date__isnull=True))
        .filter(
            Q(scope=Promotion.Scope.GLOBAL)
            | Q(scope=Promotion.Scope.CATEGORY, categories__id__in=category_ids)
            | Q(scope=Promotion.Scope.PRODUCT, products__id__in=product_ids)
        )
        .distinct()
        .prefetch_related("categories", "products")
    )

    global_promos, category_map, product_map = _gather_candidates(list(promotions))

    result: dict[str, PromotionPricing] = {}
    for product in product_list:
        candidates = []
        candidates.extend(global_promos)
        candidates.extend(category_map.get(str(product.category_id), []))
        candidates.extend(product_map.get(str(product.id), []))
        pricing = _select_best_promotion(product, candidates)
        if pricing:
            result[str(product.id)] = pricing
    return result


class PromotionPricingEngine:
    """Caches promotion pricing lookups for a set of products."""

    def __init__(self, products: Iterable[Product], moment=None) -> None:
        self._map = build_promotion_pricing_map(products, moment=moment)

    def get(self, product: Product | str | None) -> PromotionPricing | None:
        if product is None:
            return None
        if isinstance(product, Product):
            key = str(product.id)
        else:
            key = str(product)
        return self._map.get(key)
