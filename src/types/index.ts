import { UserRole, ParticipantType, EventStatus, RegistrationStatus } from '@prisma/client'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  bio?: string
}

export interface Event {
  id: string
  title: string
  description: string
  bannerUrl?: string
  linkId: string
  status: EventStatus
  maxRegistrations?: number
  createdAt: Date
  updatedAt: Date
}

export interface Registration {
  id: string
  eventId: string
  name: string
  cpf: string
  phone: string
  email: string
  cep: string
  locality: string
  city: string
  state: string
  participantType: ParticipantType
  otherType?: string
  pondCount?: number
  waterDepth?: number
  batchNumber: number
  status: RegistrationStatus
  createdAt: Date
}

export interface Course {
  id: string
  title: string
  description?: string
  bannerUrl?: string
  status: string
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  courseId: string
  title: string
  description?: string
  videoUrl?: string
  duration?: string
  order: number
}

