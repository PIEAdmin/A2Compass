interface HeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export default function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-compass-navy">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </header>
  )
}
