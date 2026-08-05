import { paths } from 'src/routes/paths';

/** Admin language CRUD lives under /admin/language (used by course forms). */
export function resolveLanguageAdminPaths() {
  return {
    root: paths.admin.language.root,
    list: paths.admin.language.list,
    new: paths.admin.language.new,
    details: paths.admin.language.details,
    edit: paths.admin.language.edit,
    sectionName: 'Language',
    sectionHref: paths.admin.language.root,
  };
}
