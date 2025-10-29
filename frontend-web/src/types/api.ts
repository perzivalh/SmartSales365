export type Category = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  created_at: string;
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

