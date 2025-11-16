import { ReactNode } from 'react'

export const dynamicParams = true

export async function generateStaticParams(): Promise<{ linkId: string }[]> {
  return []
}

export default function LinkIdLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
