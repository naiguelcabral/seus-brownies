import { createRoot } from 'react-dom/client'

import { requireDefined } from '../../../src/lib/required-value'
import { Route } from '../../../src/routes/relatorios'

const root = document.getElementById('root')
if (!root) throw new Error('Missing root')
const Page = requireDefined(Route.options.component)
createRoot(root).render(<Page />)
