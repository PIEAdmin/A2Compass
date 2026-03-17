interface Props { size?: 'sm' | 'md' | 'lg' }

export default function LoadingSpinner({ size = 'md' }: Props) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${sizeClass} animate-spin rounded-full border-4 border-gray-200 border-t-compass-blue`} />
    </div>
  )
}
