import { useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';
import { useAuthContext } from 'src/auth/hooks';
import { chatbotService } from 'src/services/chatbot.service';

export function ChatbotWidget({ title = 'AI Assistant' }) {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [hiddenByOverlay, setHiddenByOverlay] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const messagesRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const [siteLogoUrl, setSiteLogoUrl] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.localStorage.getItem('site-logo-url') || '';
  });

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! Chatbot structure is ready. Ask anything about AI Nexus.',
      id: `m-${Date.now()}`,
    },
  ]);

  const hasInput = useMemo(() => text.trim().length > 0, [text]);
  const logoSrc = siteLogoUrl || '/favicon.png';
  const userAvatarSrc = user?.avatarUrl || user?.photoURL || '';
  const userInitial = String(
    user?.displayName ||
      user?.firstname ||
      user?.firstName ||
      user?.email ||
      'U'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncLogo = (event) => {
      if (event?.detail?.logoUrl !== undefined) {
        setSiteLogoUrl(event.detail.logoUrl || '');
        return;
      }
      setSiteLogoUrl(window.localStorage.getItem('site-logo-url') || '');
    };

    window.addEventListener('site-logo-updated', syncLogo);
    window.addEventListener('storage', syncLogo);

    return () => {
      window.removeEventListener('site-logo-updated', syncLogo);
      window.removeEventListener('storage', syncLogo);
    };
  }, []);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(
    () => () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleVisibilityToggle = (event) => {
      const hidden = Boolean(event?.detail?.hidden);
      setHiddenByOverlay(hidden);
      if (hidden) {
        setOpen(false);
      }
    };
    window.addEventListener('chatbot-visibility-change', handleVisibilityToggle);
    return () => {
      window.removeEventListener('chatbot-visibility-change', handleVisibilityToggle);
    };
  }, []);

  if (hiddenByOverlay) {
    return null;
  }

  const handleSend = async () => {
    if (!hasInput || loading) return;
    const userMessage = text.trim();
    setText('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, id: `u-${Date.now()}` }]);

    try {
      const result = await chatbotService.sendMessage({ message: userMessage });
      const reply = result?.reply || 'No response received from chatbot.';
      const assistantId = `a-${Date.now()}`;
      setTypingMessageId(assistantId);

      setMessages((prev) => [...prev, { role: 'assistant', content: '', id: assistantId }]);

      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }

      const chars = Array.from(reply);
      if (!chars.length) {
        setTypingMessageId(null);
        setLoading(false);
        return;
      }

      let index = 0;
      typingIntervalRef.current = setInterval(() => {
        index += 1;
        const partial = chars.slice(0, index).join('');

        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantId ? { ...msg, content: partial } : msg))
        );

        if (index >= chars.length) {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setTypingMessageId(null);
          setLoading(false);
        }
      }, 14);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Chatbot failed: ${error?.message || 'Unknown error'}`,
          id: `e-${Date.now()}`,
        },
      ]);
      setTypingMessageId(null);
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: (theme) => theme.zIndex.tooltip + 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 1.5,
      }}
    >
      {open && (
        <Paper
          elevation={10}
          sx={{
            width: { xs: 'min(92vw, 360px)', sm: 380 },
            borderRadius: 2.5,
            overflow: 'hidden',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: (theme) => theme.customShadows?.z24 || theme.shadows[12],
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: 1.5,
              py: 1.15,
              color: 'common.white',
              bgcolor: 'secondary.main',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  bgcolor: 'common.white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0.45,
                }}
              >
                <img
                  src={logoSrc}
                  alt="AI Nexus"
                  width={32}
                  height={32}
                  style={{ objectFit: 'contain' }}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/favicon.png';
                  }}
                />
              </Box>
              <Stack spacing={0.35}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  {title}
                </Typography>
                <Chip
                  size="small"
                  label="Online"
                  icon={
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#22c55e',
                        boxShadow: '0 0 0 4px rgba(34,197,94,0.2)',
                        animation: 'chatbotPulse 1.6s ease-in-out infinite',
                        '@keyframes chatbotPulse': {
                          '0%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.35)' },
                          '70%': { boxShadow: '0 0 0 6px rgba(34,197,94,0)' },
                          '100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0)' },
                        },
                      }}
                    />
                  }
                  sx={{
                    width: 'fit-content',
                    height: 18,
                    bgcolor: 'rgba(255,255,255,0.16)',
                    color: 'common.white',
                    '& .MuiChip-label': { px: 0.8, fontSize: 11, fontWeight: 700 },
                    '& .MuiChip-icon': { ml: 0.8 },
                  }}
                />
              </Stack>
            </Stack>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'common.white' }}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>
          <Divider />

          <Stack
            ref={messagesRef}
            spacing={1}
            sx={{
              p: 1.25,
              height: 340,
              overflowY: 'auto',
              bgcolor: '#eef3fb',
            }}
          >
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 0.75,
                  maxWidth: '85%',
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    flexShrink: 0,
                    mt: 0.35,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: msg.role === 'user' ? 'transparent' : 'secondary.main',
                    color: msg.role === 'user' ? '#334155' : 'common.white',
                    border: 'none',
                  }}
                >
                  {msg.role === 'user' ? (
                    <Avatar
                      src={userAvatarSrc}
                      alt={user?.displayName || 'User'}
                      sx={{
                        width: 26,
                        height: 26,
                        fontSize: 12,
                        fontWeight: 700,
                        bgcolor: '#e2e8f0',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      {userInitial}
                    </Avatar>
                  ) : (
                    <Iconify icon="mdi:robot-happy-outline" width={16} />
                  )}
                </Box>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.95,
                    borderRadius: 2,
                    bgcolor: msg.role === 'user' ? '#0b63f6' : '#ffffff',
                    color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                    border: (theme) =>
                      msg.role === 'user' ? 'none' : `1px solid ${theme.palette.grey[300]}`,
                    boxShadow: (theme) => (msg.role === 'user' ? theme.shadows[3] : 'none'),
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: msg.role === 'user' ? '#fff' : '#1f2937' }}
                  >
                    {msg.content}
                    {loading && msg.id === typingMessageId ? '...' : ''}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>

          <Divider />
          <Stack direction="row" spacing={1} sx={{ p: 1.25, bgcolor: 'common.white' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Ask anything about AI Nexus..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  bgcolor: '#ffffff',
                  color: '#111827',
                  border: '1px solid #cbd5e1',
                  '& fieldset': { borderColor: '#cbd5e1' },
                  '&:hover fieldset': { borderColor: '#94a3b8' },
                  '&.Mui-focused fieldset': { borderColor: '#2563eb', borderWidth: '1px' },
                },
                '& .MuiInputBase-input::placeholder': { color: '#64748b', opacity: 1 },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!hasInput || loading}
              sx={{
                minWidth: 74,
                borderRadius: 1.5,
                fontWeight: 700,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
                },
                '&.Mui-disabled': {
                  color: '#e2e8f0',
                  background: '#94a3b8',
                },
              }}
            >
              Send
            </Button>
          </Stack>
        </Paper>
      )}

      <Fab
        color="primary"
        onClick={() => setOpen((prev) => !prev)}
        sx={{
          boxShadow: (theme) => theme.customShadows?.z24 || theme.shadows[10],
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          position: 'relative',
          overflow: 'visible',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.35)',
            animation: 'chatFabPulse 1.8s ease-out infinite',
          },
          '@keyframes chatFabPulse': {
            '0%': { transform: 'scale(0.92)', opacity: 0.9 },
            '70%': { transform: 'scale(1.12)', opacity: 0 },
            '100%': { transform: 'scale(1.12)', opacity: 0 },
          },
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)',
          }}
        >
          <Iconify icon="mdi:robot-excited-outline" width={22} />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 9,
            height: 9,
            borderRadius: '50%',
            bgcolor: '#22c55e',
            border: '2px solid #fff',
          }}
        />
      </Fab>
    </Box>
  );
}
