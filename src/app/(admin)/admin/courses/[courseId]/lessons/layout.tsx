import { ReactNode } from 'react'

export const dynamicParams = true

export async function generateStaticParams(): Promise<{ courseId: string }[]> {
  return []
}

export default function LessonsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
