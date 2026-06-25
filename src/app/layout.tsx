import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'TI 2026 Stats Hub',
  description: 'Dota 2 The International 2026 — Thống kê tướng, combo, đội',
}

const navItems = [
  { href: '/', label: 'Bảng Điều Khiển' },
  { href: '/heroes', label: 'Tướng' },
  { href: '/combos', label: 'Combo' },
  { href: '/teams', label: 'Đội' },
  { href: '/matches', label: 'Trận Đấu' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen">
        <header className="border-b border-red-900/30 bg-[#0d0d15] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="text-2xl">🏆</span>
              <span className="font-bold text-lg">
                <span className="text-red-500">TI</span>
                <span className="text-amber-400">2026</span>
                <span className="text-gray-400 text-sm ml-2">Stats Hub</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-red-900/20 bg-[#0d0d15] mt-12">
          <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between text-xs text-gray-600">
            <span>Dữ liệu từ OpenDota API (Miễn phí)</span>
            <span>Tự động cập nhật mỗi 30 giây</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
