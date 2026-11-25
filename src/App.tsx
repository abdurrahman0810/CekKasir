import AuthGate from './auth/AuthGate'
import OwnerLayout from './layout/OwnerLayout'

export default function App() {
  return <AuthGate><OwnerLayout /></AuthGate>
}
