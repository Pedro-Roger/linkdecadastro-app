import { ReactNode } from 'react'

export const dynamicParams = true

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return []
}

export default function SlugLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
