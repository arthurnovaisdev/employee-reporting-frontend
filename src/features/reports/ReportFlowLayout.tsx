import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import type { ReportReceipt } from './reports.api'

interface ReportFlowContextValue {
  receipt: ReportReceipt | null
  setReceipt: (receipt: ReportReceipt) => void
  busy: boolean
  setBusy: (busy: boolean) => void
}

const ReportFlowContext = createContext<ReportFlowContextValue | null>(null)

export function ReportFlowLayout() {
  const [receipt, setReceipt] = useState<ReportReceipt | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!receipt) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [receipt])

  // O provider existe somente nas rotas nova denúncia/sucesso. Sair do fluxo
  // ou recarregar descarta o comprovante, sem persistir o código sensível.
  return <ReportFlowContext.Provider value={{ receipt, setReceipt, busy, setBusy }}><Outlet /></ReportFlowContext.Provider>
}

export function ReportFlowShell() {
  const { busy } = useReportFlow()
  return <AppShell navigationDisabled={busy} />
}

export function useReportFlow() {
  const context = useContext(ReportFlowContext)
  if (!context) throw new Error('Fluxo de denúncia indisponível.')
  return context
}
