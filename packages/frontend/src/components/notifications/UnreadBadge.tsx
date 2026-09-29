const MAX_DISPLAYED_COUNT = 99

interface UnreadBadgeProps {
  count: number
}

export const UnreadBadge = ({ count }: UnreadBadgeProps) => {
  if (count <= 0) return null

  return (
    <span
      aria-label={`${count} unread messages`}
      className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full"
    >
      {count > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : count}
    </span>
  )
}
