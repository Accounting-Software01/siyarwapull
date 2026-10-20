export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
] as const

export const PRODUCT_CATEGORIES = [
  { value: 'fashion', label: 'Fashion' },
  { value: 'food', label: 'Food & drinks' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'home', label: 'Home & living' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'books', label: 'Books' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
] as const

export const PRODUCT_CATEGORY_VALUES: string[] = PRODUCT_CATEGORIES.map((c) => c.value)

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid — preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refund_required: 'Refund in progress',
  refunded: 'Refunded',
}

export const PRODUCT_IMAGE_BUCKET = 'market-images'

export function productImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`
}
