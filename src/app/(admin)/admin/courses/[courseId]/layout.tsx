import { ReactNode } from 'react'

export const dynamicParams = true

export async function generateStaticParams(): Promise<{ courseId: string }[]> {
  return []
}

export default function CourseIdLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
