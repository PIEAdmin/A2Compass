export default function AppFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white/80 py-3 px-6">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>© {new Date().getFullYear()} A² Compass · Achievement Academy</span>
        <a
          href="https://a2compass.org/privacy-policy.html"
          className="hover:text-gray-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
        <a
          href="https://a2compass.org/terms-of-service.html"
          className="hover:text-gray-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms of Service
        </a>
        <a href="mailto:hello@a2compass.org" className="hover:text-gray-600 underline">
          Contact
        </a>
      </div>
    </footer>
  )
}
