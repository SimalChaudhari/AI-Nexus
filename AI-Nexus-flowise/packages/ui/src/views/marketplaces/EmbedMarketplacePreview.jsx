import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactFlow, { Background, Controls, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'
import '@/views/canvas/index.css'
import { useSelector } from 'react-redux'

import { Box, CircularProgress, Typography } from '@mui/material'
import { IconArtboard, IconArtboardOff, IconMagnetFilled, IconMagnetOff } from '@tabler/icons-react'

import AgentFlowNode from '@/views/agentflowsv2/AgentFlowNode'
import AgentFlowEdge from '@/views/agentflowsv2/AgentFlowEdge'
import IterationNode from '@/views/agentflowsv2/IterationNode'
import StickyNote from '@/views/agentflowsv2/StickyNote'

const nodeTypes = { agentFlow: AgentFlowNode, stickyNote: StickyNote, iteration: IterationNode }
const edgeTypes = { agentFlow: AgentFlowEdge }

const parseFlowDataFromHash = () => {
    try {
        const hash = window.location.hash || ''
        if (!hash.includes('flowData=')) return null
        const raw = hash.replace(/^#/, '')
        const params = new URLSearchParams(raw)
        const encoded = params.get('flowData')
        if (!encoded) return null
        const json = decodeURIComponent(atob(decodeURIComponent(encoded)))
        const parsed = JSON.parse(json)
        if (!parsed || typeof parsed !== 'object') return null
        return {
            nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
            edges: Array.isArray(parsed.edges) ? parsed.edges : []
        }
    } catch {
        return null
    }
}

const EmbedMarketplacePreview = () => {
    const [searchParams] = useSearchParams()
    const customization = useSelector((state) => state.customization)
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [loading, setLoading] = useState(true)
    const [isSnappingEnabled, setIsSnappingEnabled] = useState(false)
    const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(true)
    const reactFlowWrapper = useRef(null)

    useEffect(() => {
        const onMessage = (event) => {
            try {
                const payload = event?.data
                if (!payload || payload?.type !== 'AINEXUS_FLOW_PREVIEW') return
                const flowData = payload?.flowData
                if (!flowData || typeof flowData !== 'object') return
                setNodes(Array.isArray(flowData.nodes) ? flowData.nodes : [])
                setEdges(Array.isArray(flowData.edges) ? flowData.edges : [])
                setLoading(false)
            } catch {
                // Ignore malformed cross-window messages
            }
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [setEdges, setNodes])

    useEffect(() => {
        setLoading(true)
        const hashFlowData = parseFlowDataFromHash()
        if (hashFlowData) {
            setNodes(hashFlowData.nodes)
            setEdges(hashFlowData.edges)
            setLoading(false)
            return
        }

        const encodedFlowData = searchParams.get('flowData')
        if (encodedFlowData) {
            try {
                const decodedJson = decodeURIComponent(atob(encodedFlowData))
                const parsed = JSON.parse(decodedJson)
                setNodes(Array.isArray(parsed?.nodes) ? parsed.nodes : [])
                setEdges(Array.isArray(parsed?.edges) ? parsed.edges : [])
            } catch {
                setNodes([])
                setEdges([])
            } finally {
                setLoading(false)
            }
            return
        }

        setNodes([])
        setEdges([])
        setLoading(false)
    }, [searchParams, setEdges, setNodes])

    return (
        <Box sx={{ width: '100%', height: '100vh', bgcolor: '#ffffff' }}>
            {loading ? (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : nodes.length === 0 ? (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant='body2' color='text.secondary'>
                        Preview unavailable
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ width: '100%', height: '100%' }}>
                    <div className='reactflow-parent-wrapper'>
                        <div className='reactflow-wrapper' ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                fitView
                                minZoom={0.1}
                                maxZoom={2}
                                nodesDraggable={false}
                                nodesConnectable={false}
                                elementsSelectable={false}
                                panOnDrag
                                panOnScroll={false}
                                zoomOnScroll
                                zoomOnPinch
                                zoomOnDoubleClick={false}
                                preventScrolling
                                snapGrid={[25, 25]}
                                snapToGrid={isSnappingEnabled}
                                proOptions={{ hideAttribution: true }}
                            >
                                <Controls
                                    className={customization.isDarkMode ? 'dark-mode-controls' : ''}
                                    showInteractive={false}
                                    position='bottom-left'
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        left: '24px',
                                        bottom: '24px',
                                        pointerEvents: 'all'
                                    }}
                                >
                                    <button
                                        className='react-flow__controls-button react-flow__controls-interactive'
                                        onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
                                        title='toggle snapping'
                                        aria-label='toggle snapping'
                                    >
                                        {isSnappingEnabled ? <IconMagnetFilled /> : <IconMagnetOff />}
                                    </button>
                                    <button
                                        className='react-flow__controls-button react-flow__controls-interactive'
                                        onClick={() => setIsBackgroundEnabled(!isBackgroundEnabled)}
                                        title='toggle background'
                                        aria-label='toggle background'
                                    >
                                        {isBackgroundEnabled ? <IconArtboard /> : <IconArtboardOff />}
                                    </button>
                                </Controls>
                                {isBackgroundEnabled && <Background color='#aaa' gap={16} />}
                            </ReactFlow>
                        </div>
                    </div>
                </Box>
            )}
        </Box>
    )
}

export default EmbedMarketplacePreview

