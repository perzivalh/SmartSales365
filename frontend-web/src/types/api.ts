export type Category = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  created_at: string;
};

export type PromotionScope = "GLOBAL" | "CATEGORY" | "PRODUCT";
export type PromotionType = "PERCENT" | "AMOUNT";

export type ProductPromotionSummary = {
  id: string;
  name: string;
  discount_type: PromotionType;
  discount_value: string;
  scope: PromotionScope;
  description: string;
  start_date: string | null;
  end_date: string | null;
  discount_amount: string;
  final_price: string;
};

export type Promotion = {
  id: string;
  name: string;
  description: string;
  discount_type: PromotionType;
  discount_value: string;
  scope: PromotionScope;
  categories: string[];
  products: string[];
  category_names: string[];
  product_names: string[];
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id?: string;
  url: string;
  position: number;
  is_cover: boolean;
  mime_type?: string | null;
  size_bytes?: number | null;
};

export type ProductFeature = {
  id?: string;
  label: string;
};

export type Product = {
  id: string;
  category: string;
  category_name: string;
  name: string;
  sku: string;
  short_description: string;
  long_description: string;
  price: string;
  stock: number;
  width_cm: string;
  height_cm: string;
  weight_kg: string;
  is_active: boolean;
  cover_image_url: string | null;
  images: ProductImage[];
  features: ProductFeature[];
  created_at: string;
  updated_at: string;
  active_promotion?: ProductPromotionSummary | null;
  final_price: string;
};

export type Customer = {
  id: string;
  user: string;
  user_email: string;
  phone: string;
  doc_id: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "ADMIN" | "CLIENT";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "FAILED" | "CANCELED";
export type OrderFulfillmentStatus = "PENDING" | "PROCESSING" | "IN_TRANSIT" | "DELIVERED";

export type OrderItemSummary = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  unit_price: string;
  quantity: number;
  total_price: string;
  discount_amount: string;
  promotion_snapshot?: Record<string, unknown>;
};

export type Order = {
  id: string;
  number: string;
  status: OrderStatus;
  fulfillment_status: OrderFulfillmentStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  notes: string;
  subtotal_amount: string;
  tax_amount: string;
  shipping_amount: string;
  discount_amount: string;
  total_amount: string;
  currency: string;
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItemSummary[];
};

export type CheckoutCartItem = {
  product_id: string;
  quantity: number;
};

export type CheckoutCustomer = {
  email: string;
  name: string;
  phone?: string;
};

export type CheckoutAddress = {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
};

export type CheckoutPayload = {
  cart: CheckoutCartItem[];
  customer: CheckoutCustomer;
  shipping_address: CheckoutAddress;
  notes?: string;
};

export type CheckoutStartResponse = {
  order_id: string;
  order_number: string;
  client_secret: string;
  total_amount: string;
  currency: string;
  status: OrderStatus;
};

export type DynamicReportRow = Record<string, unknown>;

export type DynamicReportExport = {
  archivo: string;
  nombre: string;
  content_type: string;
};

export type DynamicReportResponse = {
  resumen: string;
  consulta_sql: string;
  columnas: string[];
  filas: DynamicReportRow[];
  exportacion?: DynamicReportExport;
  generado_en?: string;
};

export type ProductRecommendationMetrics = {
  units_sold: number;
  total_revenue: string;
  category_name: string | null;
};

export type ProductRecommendation = Product & {
  metrics: ProductRecommendationMetrics;
};

export type ProductRecommendationsResponse = {
  strategy: "personalized" | "top_sellers";
  summary: string;
  products: ProductRecommendation[];
};

export type AuditLogEventType =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SYSTEM_ERROR"
  | "ACTION";

export type AuditLogRecord = {
  id: string;
  event_type: AuditLogEventType;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, unknown>;
  request_ip: string | null;
  user_agent: string | null;
  created_at: string;
  actor: string | null;
  actor_email: string | null;
  actor_name: string | null;
};
