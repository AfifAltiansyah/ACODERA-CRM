import { useNavigate } from 'react-router-dom'
import { LeftPanel } from '../components/LeftPanel'
import { RightPanel } from '../components/RightPanel'

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-[var(--canvas)]">
      <LeftPanel />
      <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12">
        <RightPanel onSuccess={() => navigate('/dashboard', { replace: true })} />
      </div>
    </div>
  )
}
