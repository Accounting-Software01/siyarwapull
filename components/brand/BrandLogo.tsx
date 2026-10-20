interface BrandLogoProps {
  /** Height of the icon tile in px */
  size?: number
  /** Hide the "Siyarwa Pull" text and show only the icon */
  iconOnly?: boolean
  className?: string
}

/** The Siyarwa Pull logo: app icon tile + name. Use this wherever the brand appears. */
export default function BrandLogo({ size = 28, iconOnly = false, className = '' }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/siyarwa-pull-logo-128.png"
        alt={iconOnly ? 'Siyarwa Pull' : ''}
        width={size}
        height={size}
        style={{ height: size, width: size, borderRadius: Math.round(size * 0.24) }}
        className="shrink-0"
      />
      {!iconOnly && (
        <span
          className="whitespace-nowrap font-black tracking-[-0.04em] text-[#121518]"
          style={{ fontSize: Math.round(size * 0.68), lineHeight: 1 }}
        >
          Siyarwa Pull
        </span>
      )}
    </span>
  )
}
