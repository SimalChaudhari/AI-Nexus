SELECT s.title, sp."watchedSeconds", sp."durationSeconds", sp."isCompleted", sp."completionPercent", sp."updatedAt"
FROM course_section_watch_progress sp
JOIN course_module_sections s ON s.id = sp."sectionId"
JOIN users u ON u.id = sp."userId"
WHERE u.email = 'simal@yopmail.com' AND s.title = 'sev2';
