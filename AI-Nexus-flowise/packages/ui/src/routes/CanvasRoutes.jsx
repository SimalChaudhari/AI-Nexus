import { lazy } from 'react'

// project imports
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'
import { RequireAuth } from '@/routes/RequireAuth'

// canvas routing
const Canvas = Loadable(lazy(() => import('@/views/canvas')))
const MarketplaceCanvas = Loadable(lazy(() => import('@/views/marketplaces/MarketplaceCanvas')))
const CanvasV2 = Loadable(lazy(() => import('@/views/agentflowsv2/Canvas')))
const MarketplaceCanvasV2 = Loadable(lazy(() => import('@/views/agentflowsv2/MarketplaceCanvas')))
const EmbedAgentflowPreview = Loadable(lazy(() => import('@/views/agentflowsv2/EmbedAgentflowPreview')))
const EmbedMarketplacePreview = Loadable(lazy(() => import('@/views/marketplaces/EmbedMarketplacePreview')))

// ==============================|| CANVAS ROUTING ||============================== //

const CanvasRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/canvas',
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/canvas/:id',
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/agentcanvas',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/agentcanvas/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/v2/agentcanvas',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <CanvasV2 />
                </RequireAuth>
            )
        },
        {
            path: '/v2/agentcanvas/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <CanvasV2 />
                </RequireAuth>
            )
        },
        {
            path: '/embed/agentflow/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <EmbedAgentflowPreview />
                </RequireAuth>
            )
        },
        {
            path: '/embed/agentflow-preview',
            element: <EmbedAgentflowPreview />
        },
        {
            path: '/embed/marketplace-preview',
            element: <EmbedMarketplacePreview />
        },
        {
            path: '/marketplace/:id',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <MarketplaceCanvas />
                </RequireAuth>
            )
        },
        {
            path: '/v2/marketplace/:id',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <MarketplaceCanvasV2 />
                </RequireAuth>
            )
        }
    ]
}

export default CanvasRoutes
