import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    OutlinedInput,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Radio,
    RadioGroup,
    Typography,
    Stack
} from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'

const SaveChatflowDialog = ({ show, dialogProps, onCancel, onConfirm, showTemplateVisibility = false }) => {
    const portalElement = document.getElementById('portal')

    const [chatflowName, setChatflowName] = useState('')
    const [templateVisibility, setTemplateVisibility] = useState('public')
    const [isReadyToSave, setIsReadyToSave] = useState(false)

    useEffect(() => {
        if (chatflowName) setIsReadyToSave(true)
        else setIsReadyToSave(false)
    }, [chatflowName])

    useEffect(() => {
        if (!show) {
            setChatflowName('')
            setTemplateVisibility('public')
        }
    }, [show])

    const handleConfirm = () => {
        if (showTemplateVisibility) {
            onConfirm(chatflowName, { templateVisibility })
            return
        }
        onConfirm(chatflowName)
    }

    const component = show ? (
        <Dialog
            open={show}
            fullWidth
            maxWidth='xs'
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
            disableRestoreFocus // needed due to StrictMode
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    <OutlinedInput
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        id='chatflow-name'
                        type='text'
                        fullWidth
                        placeholder='My New Chatflow'
                        value={chatflowName}
                        onChange={(e) => setChatflowName(e.target.value)}
                        onKeyDown={(e) => {
                            if (isReadyToSave && e.key === 'Enter') handleConfirm()
                        }}
                    />
                    {showTemplateVisibility && (
                        <FormControl>
                            <Typography variant='subtitle2' sx={{ mb: 0.75 }}>
                                AI Nexus template visibility
                            </Typography>
                            <RadioGroup
                                value={templateVisibility}
                                onChange={(e) => setTemplateVisibility(e.target.value)}
                            >
                                <FormControlLabel
                                    value='public'
                                    control={<Radio size='small' />}
                                    label='Public — visible to all users in AI Nexus'
                                />
                                <FormControlLabel
                                    value='private'
                                    control={<Radio size='small' />}
                                    label='Private — only you can see this template'
                                />
                            </RadioGroup>
                        </FormControl>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{dialogProps.cancelButtonName}</Button>
                <StyledButton disabled={!isReadyToSave} variant='contained' onClick={handleConfirm}>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

SaveChatflowDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    showTemplateVisibility: PropTypes.bool
}

export default SaveChatflowDialog
