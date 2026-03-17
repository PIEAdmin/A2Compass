export default function ActionBar() {
  const actions = [
    { label: 'Create Activity', icon: '➕', disabled: true, hint: 'Phase 2' },
    { label: 'Assign Work', icon: '📤', disabled: true, hint: 'Phase 2' },
    { label: 'View Reports', icon: '📈', disabled: false, hint: '' },
    { label: 'Message', icon: '✉️', disabled: true, hint: 'Phase 3' },
  ]

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          disabled={action.disabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            action.disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-compass-blue text-white hover:bg-blue-700'
          }`}
          title={action.hint ? `Coming in ${action.hint}` : undefined}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
          {action.hint && <span className="text-xs opacity-60">({action.hint})</span>}
        </button>
      ))}
    </div>
  )
}
