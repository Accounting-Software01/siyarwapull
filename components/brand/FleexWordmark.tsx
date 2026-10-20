import BrandLogo from '@/components/brand/BrandLogo'

interface FleexWordmarkProps {
  /** Rendered height in px */
  height?: number
  className?: string
}

/**
 * Kept under its old name so existing imports keep working.
 * It now renders the Siyarwa Pull logo.
 */
export default function FleexWordmark({ height = 24, className = '' }: FleexWordmarkProps) {
  return <BrandLogo size={height} className={className} />
}
