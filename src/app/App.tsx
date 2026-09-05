import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import { AppRouter } from './AppRouter'

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  )
}
