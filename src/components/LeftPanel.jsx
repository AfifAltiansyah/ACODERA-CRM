import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import logo from '../assets/Acodera-logo.png'

const stagger = (i) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
})

export function LeftPanel() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#1d1d1f] p-14 xl:p-20 overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />

      <div className="relative z-10">
        <motion.img
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          src={logo}
          alt="Acodera"
          className="h-9 w-auto brightness-0 invert"
        />
      </div>

      <div className="relative z-10 max-w-md">
        <motion.h1
          {...stagger(0)}
          className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-white"
        >
          Intelligence that
          <span className="block mt-2 text-[#2997ff]">drives growth</span>
        </motion.h1>

        <motion.p
          {...stagger(1)}
          className="mt-5 text-[17px] leading-[1.5] text-[#a1a1a6]"
        >
          The all-in-one CRM platform that helps your team organize, track, and grow customer relationships with powerful automation.
        </motion.p>

        <motion.div {...stagger(2)} className="flex gap-10 mt-10">
          <div>
            <div className="text-[28px] font-semibold tracking-[-0.01em] text-white">12K+</div>
            <div className="text-[13px] text-[#86868b] mt-1">Active Users</div>
          </div>
          <div>
            <div className="text-[28px] font-semibold tracking-[-0.01em] text-white">98%</div>
            <div className="text-[13px] text-[#86868b] mt-1">Satisfaction</div>
          </div>
          <div>
            <div className="text-[28px] font-semibold tracking-[-0.01em] text-white">$2.4B</div>
            <div className="text-[13px] text-[#86868b] mt-1">Pipeline Value</div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400/60" />
            <div className="w-2 h-2 rounded-full bg-amber-400/60" />
            <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
          </div>
          <span className="text-[12px] text-[#86868b] font-medium tracking-[-0.01em]">Dashboard Overview</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Leads', value: '1,284', change: '+12.5%', up: true, color: 'text-cyan-400' },
            { label: 'Deals', value: '342', change: '+8.2%', up: true, color: 'text-[#2997ff]' },
            { label: 'Revenue', value: '$84K', change: '-2.1%', up: false, color: 'text-rose-400' },
          ].map((item, i) => (
            <div key={i} className="rounded-[11px] bg-white/[0.05] p-3.5">
              <div className="text-[11px] text-[#86868b] font-medium mb-1.5">{item.label}</div>
              <div className="text-[20px] font-semibold text-white tracking-[-0.01em]">{item.value}</div>
              <div className={`flex items-center gap-0.5 mt-1.5 text-[11px] ${item.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {item.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {item.change}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-[3px] h-[60px]">
          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.7 + i * 0.04, duration: 0.5, ease: 'easeOut' }}
              className={`flex-1 rounded-t-[2px] ${i === 7 ? 'bg-[#0066cc]' : 'bg-white/[0.07]'}`}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="relative z-10 flex items-center justify-between text-[11px] text-[#86868b]"
      >
        <span>© 2026 Acodera CRM</span>
        <div className="flex gap-5">
          <a href="#" className="hover:text-[#a1a1a6] transition-colors">Privacy</a>
          <a href="#" className="hover:text-[#a1a1a6] transition-colors">Terms</a>
          <a href="#" className="hover:text-[#a1a1a6] transition-colors">Support</a>
        </div>
      </motion.div>
    </motion.div>
  )
}
