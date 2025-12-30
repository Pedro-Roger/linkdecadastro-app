import { useEffect, useRef, useState } from 'react'

interface Option {
    value: string
    label: string
}

interface SearchableSelectProps {
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder?: string
    searchPlaceholder?: string
    disabled?: boolean
    loading?: boolean
    className?: string
    error?: boolean
}

export function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = 'Selecione...',
    searchPlaceholder = 'Buscar...',
    disabled = false,
    loading = false,
    className = '',
    error = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const selectedOption = options.find((opt) => opt.value === value)

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus()
        }
        if (!isOpen) {
            setSearchTerm('')
        }
    }, [isOpen])

    const handleSelect = (optionValue: string) => {
        onChange(optionValue)
        setIsOpen(false)
        setSearchTerm('')
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
                disabled={disabled || loading}
                className={`w-full rounded-md border bg-white px-4 py-3 text-left text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600] md:py-2 md:text-sm ${error ? 'border-red-300' : 'border-gray-300'
                    } ${disabled || loading ? 'bg-gray-100 cursor-not-allowed opacity-70' : 'cursor-pointer'
                    }`}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
                    {loading
                        ? 'Carregando...'
                        : selectedOption
                            ? selectedOption.label
                            : placeholder}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg
                        className="h-5 w-5 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path
                            d="M7 7l3-3 3 3m0 6l-3 3-3-3"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    <div className="sticky top-0 z-10 bg-white px-2 py-2 border-b">
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#FF6600] focus:outline-none focus:ring-1 focus:ring-[#FF6600]"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {filteredOptions.length === 0 ? (
                        <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                            Nenhuma opção encontrada.
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className={`relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-[#FFF4ED] ${option.value === value ? 'bg-[#FFF4ED] text-[#FF6600] font-medium' : 'text-gray-900'
                                    }`}
                                onClick={() => handleSelect(option.value)}
                            >
                                <span className="block truncate">{option.label}</span>
                                {option.value === value && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#FF6600]">
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
