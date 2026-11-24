import { useState } from 'react'
import type { User } from '@shared/types'

export function Avatar({ user, className = '' }: { user: User | null; className?: string }) {
  const [failedImage, setFailedImage] = useState<string>()
  const image = user?.profileImage
  return <span className={`avatar ${className}`} aria-hidden="true">
    {image && image !== failedImage
      ? <img src={image} alt="" onError={() => setFailedImage(image)} />
      : <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>}
  </span>
}
