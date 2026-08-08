          {tab === 'footer' ? (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  General
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    label="Tagline"
                    value={footer.tagline || ''}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, tagline: e.target.value },
                      }))
                    }
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Copyright"
                    helperText="Use {year} for current year"
                    value={footer.copyrightText || ''}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, copyrightText: e.target.value },
                      }))
                    }
                  />
                </Box>
              </Box>

              <Divider />

              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Social
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="mingcute:add-line" width={16} />}
                    disabled={social.length >= 6}
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          social: [
                            ...(prev.footer?.social || []),
                            { icon: 'mdi:linkedin', href: '' },
                          ],
                        },
                      }))
                    }
                  >
                    Add
                  </Button>
                </Stack>

                <Stack spacing={1}>
                  {social.map((item, index) => (
                    <Stack
                      key={`social-${index}`}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderRadius: 1,
                        border: (t) => `1px solid ${t.palette.divider}`,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <CompactIconButton
                        icon={item.icon}
                        onClick={() => openIconPicker({ kind: 'social', index })}
                        title="Choose icon"
                      />
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="https://..."
                        value={item.href || ''}
                        onChange={(e) =>
                          patch((prev) => {
                            const next = [...(prev.footer?.social || [])];
                            next[index] = { ...next[index], href: e.target.value };
                            return { ...prev, footer: { ...prev.footer, social: next } };
                          })
                        }
                      />
                      <IconButton
                        size="small"
                        color="error"
                        disabled={social.length <= 1}
                        onClick={() =>
                          patch((prev) => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              social: (prev.footer?.social || []).filter((_, i) => i !== index),
                            },
                          }))
                        }
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Columns
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="mingcute:add-line" width={16} />}
                    disabled={columns.length >= 4}
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          columns: [
                            ...(prev.footer?.columns || []),
                            { title: '', links: [{ label: '', href: '' }] },
                          ],
                        },
                      }))
                    }
                  >
                    Add column
                  </Button>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: 1.5,
                    alignItems: 'start',
                  }}
                >
                  {columns.map((col, colIndex) => (
                    <Box
                      key={`col-${colIndex}`}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        border: (t) => `1px solid ${t.palette.divider}`,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            size="small"
                            fullWidth
                            label="Title"
                            value={col.title || ''}
                            onChange={(e) =>
                              patch((prev) => {
                                const next = [...(prev.footer?.columns || [])];
                                next[colIndex] = { ...next[colIndex], title: e.target.value };
                                return { ...prev, footer: { ...prev.footer, columns: next } };
                              })
                            }
                          />
                          <IconButton
                            size="small"
                            color="error"
                            disabled={columns.length <= 1}
                            onClick={() =>
                              patch((prev) => ({
                                ...prev,
                                footer: {
                                  ...prev.footer,
                                  columns: (prev.footer?.columns || []).filter(
                                    (_, i) => i !== colIndex
                                  ),
                                },
                              }))
                            }
                          >
                            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                          </IconButton>
                        </Stack>

                        {(col.links || []).map((link, linkIndex) => (
                          <Stack
                            key={`link-${colIndex}-${linkIndex}`}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <TextField
                              size="small"
                              label="Label"
                              value={link.label || ''}
                              onChange={(e) =>
                                patch((prev) => {
                                  const nextCols = [...(prev.footer?.columns || [])];
                                  const nextLinks = [...(nextCols[colIndex]?.links || [])];
                                  nextLinks[linkIndex] = {
                                    ...nextLinks[linkIndex],
                                    label: e.target.value,
                                  };
                                  nextCols[colIndex] = {
                                    ...nextCols[colIndex],
                                    links: nextLinks,
                                  };
                                  return {
                                    ...prev,
                                    footer: { ...prev.footer, columns: nextCols },
                                  };
                                })
                              }
                              sx={{ flex: 1, minWidth: 0 }}
                            />
                            <TextField
                              size="small"
                              label="URL"
                              value={link.href || ''}
                              onChange={(e) =>
                                patch((prev) => {
                                  const nextCols = [...(prev.footer?.columns || [])];
                                  const nextLinks = [...(nextCols[colIndex]?.links || [])];
                                  nextLinks[linkIndex] = {
                                    ...nextLinks[linkIndex],
                                    href: e.target.value,
                                  };
                                  nextCols[colIndex] = {
                                    ...nextCols[colIndex],
                                    links: nextLinks,
                                  };
                                  return {
                                    ...prev,
                                    footer: { ...prev.footer, columns: nextCols },
                                  };
                                })
                              }
                              sx={{ flex: 1, minWidth: 0 }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                patch((prev) => {
                                  const nextCols = [...(prev.footer?.columns || [])];
                                  nextCols[colIndex] = {
                                    ...nextCols[colIndex],
                                    links: (nextCols[colIndex]?.links || []).filter(
                                      (_, i) => i !== linkIndex
                                    ),
                                  };
                                  return {
                                    ...prev,
                                    footer: { ...prev.footer, columns: nextCols },
                                  };
                                })
                              }
                            >
                              <Iconify icon="mingcute:close-line" width={16} />
                            </IconButton>
                          </Stack>
                        ))}

                        <Button
                          size="small"
                          color="inherit"
                          startIcon={<Iconify icon="mingcute:add-line" width={14} />}
                          onClick={() =>
                            patch((prev) => {
                              const nextCols = [...(prev.footer?.columns || [])];
                              nextCols[colIndex] = {
                                ...nextCols[colIndex],
                                links: [
                                  ...(nextCols[colIndex]?.links || []),
                                  { label: '', href: '' },
                                ],
                              };
                              return { ...prev, footer: { ...prev.footer, columns: nextCols } };
                            })
                          }
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          Add link
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Stack>
          ) : null}

