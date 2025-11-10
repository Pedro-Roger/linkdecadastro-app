'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const registrationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().min(11, 'CPF inválido').max(11, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido'),
  cep: z.string().min(8, 'CEP inválido').max(8, 'CEP inválido'),
  locality: z.string().min(1, 'Localidade é obrigatória'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório').max(2, 'Estado inválido'),
  participantType: z.enum(['PRODUTOR', 'OUTROS']),
  otherType: z.string().optional(),
  pondCount: z.number().optional(),
  waterDepth: z.number().optional(),
}).refine((data) => {
  if (data.participantType === 'PRODUTOR') {
    return data.pondCount !== undefined && data.waterDepth !== undefined
  }
  return true
}, {
  message: 'Campos de produtor são obrigatórios',
  path: ['pondCount']
})

type RegistrationFormData = z.infer<typeof registrationSchema>

export default function RegistrationForm({ eventId }: { eventId: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema)
  })

  const participantType = watch('participantType')

  const onSubmit = async (data: RegistrationFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, eventId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar cadastro')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-2xl font-bold mb-4">
          ✓ Cadastro realizado com sucesso!
        </div>
        <p className="text-gray-600">
          Você receberá um email de confirmação em breve.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome Completo *
        </label>
        <input
          {...register('name')}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF *
          </label>
          <input
            {...register('cpf')}
            maxLength={11}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone *
          </label>
          <input
            {...register('phone')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-mail *
        </label>
        <input
          type="email"
          {...register('email')}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CEP *
          </label>
          <input
            {...register('cep')}
            maxLength={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.cep && <p className="text-red-500 text-sm mt-1">{errors.cep.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Localidade/Bairro *
          </label>
          <input
            {...register('locality')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.locality && <p className="text-red-500 text-sm mt-1">{errors.locality.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cidade *
          </label>
          <input
            {...register('city')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estado *
        </label>
        <input
          {...register('state')}
          maxLength={2}
          placeholder="CE"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
        />
        {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Selecione a opção que melhor descreve você *
        </label>
        <select
          {...register('participantType')}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
        >
          <option value="">Selecione...</option>
          <option value="PRODUTOR">Produtor</option>
          <option value="OUTROS">Outros</option>
        </select>
        {errors.participantType && <p className="text-red-500 text-sm mt-1">{errors.participantType.message}</p>}
      </div>

      {participantType === 'PRODUTOR' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade de Viveiros *
            </label>
            <input
              type="number"
              {...register('pondCount', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
            {errors.pondCount && <p className="text-red-500 text-sm mt-1">{errors.pondCount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lâmina d&apos;água (metros) *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('waterDepth', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
            />
            {errors.waterDepth && <p className="text-red-500 text-sm mt-1">{errors.waterDepth.message}</p>}
          </div>
        </>
      )}

      {participantType === 'OUTROS' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            O que você é? *
          </label>
          <input
            {...register('otherType')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FF6600] focus:border-transparent text-gray-900"
          />
          {errors.otherType && <p className="text-red-500 text-sm mt-1">{errors.otherType.message}</p>}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#FF6600] text-white py-3 px-6 rounded-md font-semibold hover:bg-[#e55a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Enviando...' : 'Confirmar Cadastro'}
      </button>
    </form>
  )
}

