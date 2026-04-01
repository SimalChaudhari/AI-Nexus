import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { CenteredCircularLoader } from 'src/components/loading/centered-circular-loader';
import {
  NavUl,
  NavLi,
  NavCollapse,
  Subheader,
  navSectionClasses,
  navSectionCssVars,
} from 'src/components/nav-section';

// ----------------------------------------------------------------------
// Comment list with same structure & styling as sidebar nav.
// YouTube-style: vertical tree line, "X replies v" (expand) / "Hide replies ^" (collapse).
// ----------------------------------------------------------------------

export function CommentSectionNav({
  subheader = 'COMMENTS',
  open,
  onToggleOpen,
  loading = false,
  commentTree = [],
  emptyMessage = 'No comments yet.',
  renderComment,
  sx,
}) {
  const theme = useTheme();
  const cssVars = navSectionCssVars.vertical(theme);

  // Which root comments have replies expanded (YouTube: "Hide replies" when true)
  const [expandedReplies, setExpandedReplies] = useState(() => new Set());
  const toggleReplies = useCallback((commentId) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const hasReplies = (comment) =>
    comment.replies && comment.replies.length > 0;

  const totalReplyCount = (comment) => {
    const direct = comment.replies?.length ?? 0;
    if (direct === 0) return 0;
    return direct + (comment.replies || []).reduce((sum, r) => sum + totalReplyCount(r), 0);
  };

  const isRepliesExpanded = (commentId) => expandedReplies.has(commentId);


  // Recursive list of replies (supports reply-under-reply at any depth)
  const renderReplyList = (replies, depth = 0) =>
    replies.map((reply) => (
      <NavLi key={reply.id}>
        {renderComment && renderComment(reply, { isReply: true, depth })}
        {hasReplies(reply) && (
          <Box sx={{ mt: 0.5 }}>
            <NavCollapse
              in
              depth={1}
              unmountOnExit
              mountOnEnter
              sx={{
                pl: 0,
                [`& .${navSectionClasses.ul}`]: {
                  pl: 0,
                  '&::before': { display: 'none' },
                },
              }}
            >
              <NavUl sx={{ gap: 1, pl: 0, mt: 1 }}>
                {renderReplyList(reply.replies, depth + 1)}
              </NavUl>
            </NavCollapse>
          </Box>
        )}
      </NavLi>
    ));

  return (
    <Box sx={{ ...cssVars, ...sx }}>
      <NavUl sx={{ gap: 'var(--nav-item-gap)' }}>
        <NavLi>
          <Subheader
            data-title={subheader}
            open={open}
            onClick={onToggleOpen}
          >
            {subheader}
          </Subheader>
          <Collapse in={open}>
            {loading ? (
              <CenteredCircularLoader size={32} py={3} />
            ) : !commentTree || commentTree.length === 0 ? (
              <Box sx={{ py: 2, px: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </Box>
            ) : (
              <NavUl sx={{ gap: 1.5, pl: 0 }}>
                {commentTree.map((comment) => {
                  const repliesExpanded = isRepliesExpanded(comment.id);
                  const count = totalReplyCount(comment);
                  return (
                    <NavLi
                      key={comment.id}
                      sx={{
                        [`& .${navSectionClasses.li}`]: {
                          '&:first-of-type': { mt: 'var(--nav-item-gap)' },
                        },
                      }}
                    >
                      {renderComment && renderComment(comment, { isReply: false })}
                      {hasReplies(comment) && (
                        <Box sx={{ mt: 0.5 }}>
                          {repliesExpanded ? (
                            <>
                              <NavCollapse
                                in
                                depth={1}
                                unmountOnExit
                                mountOnEnter
                                sx={{
                                  pl: 0,
                                  [`& .${navSectionClasses.ul}`]: {
                                    pl: 0,
                                    '&::before': { display: 'none' },
                                  },
                                }}
                              >
                                <NavUl sx={{ gap: 1, pl: 0, mt: 1 }}>
                                  {renderReplyList(comment.replies)}
                                </NavUl>
                              </NavCollapse>
                              <Button
                                size="small"
                                onClick={() => toggleReplies(comment.id)}
                                startIcon={
                                  <Iconify
                                    icon="eva:arrow-ios-upward-fill"
                                    width={16}
                                    sx={{ color: 'text.secondary' }}
                                  />
                                }
                                sx={{
                                  minWidth: 'auto',
                                  px: 0,
                                  py: 0.5,
                                  mt: 0.5,
                                  color: 'text.secondary',
                                  fontSize: theme.typography.pxToRem(12),
                                  textTransform: 'none',
                                  '&:hover': {
                                    color: 'primary.main',
                                    bgcolor: 'transparent',
                                  },
                                }}
                              >
                                Hide replies
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="small"
                              onClick={() => toggleReplies(comment.id)}
                              startIcon={
                                <Iconify
                                  icon="eva:arrow-ios-downward-fill"
                                  width={16}
                                  sx={{ color: 'text.secondary' }}
                                />
                              }
                              sx={{
                                minWidth: 'auto',
                                px: 0,
                                py: 0.5,
                                color: 'text.secondary',
                                fontSize: theme.typography.pxToRem(12),
                                textTransform: 'none',
                                '&:hover': {
                                  color: 'primary.main',
                                  bgcolor: 'transparent',
                                },
                              }}
                            >
                              {count} {count === 1 ? 'reply' : 'replies'}
                            </Button>
                          )}
                        </Box>
                      )}
                    </NavLi>
                  );
                })}
              </NavUl>
            )}
          </Collapse>
        </NavLi>
      </NavUl>
    </Box>
  );
}
