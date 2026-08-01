const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadExport(filePath, exportName) {
  const src = fs
    .readFileSync(filePath, 'utf8')
    .replace(new RegExp(`export\\s+const\\s+${exportName}\\s*=`), 'module.exports =');
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(src, sandbox, { filename: filePath });
  return sandbox.module.exports;
}

(async () => {
  const feDir = path.join(
    __dirname,
    '..',
    '..',
    'AI-Nexus-frontend',
    'src',
    'sections',
    'international',
    'pathway',
  );
  const MODULES = loadExport(path.join(feDir, 'pathway-modules.js'), 'MODULES');
  const ROLES = loadExport(path.join(feDir, 'pathway-roles.js'), 'ROLES');

  if (!Array.isArray(MODULES) || !MODULES.length) {
    throw new Error('Failed to load MODULES from frontend');
  }
  if (!Array.isArray(ROLES) || !ROLES.length) {
    throw new Error('Failed to load ROLES from frontend');
  }

  const client = new Client({
    connectionString: 'postgresql://postgres:root@localhost:5432/ainexus-db',
  });
  await client.connect();

  await client.query('DELETE FROM intl_pathway_modules');
  await client.query('DELETE FROM intl_pathway_roles');

  for (let i = 0; i < MODULES.length; i += 1) {
    const m = MODULES[i];
    await client.query(
      `INSERT INTO intl_pathway_modules
        (code, title, pillar, minutes, "videoUrl", bullets, "sortOrder", deleted)
       VALUES ($1,$2,$3,$4,NULL,$5::jsonb,$6,false)`,
      [m.code, m.title, m.pillar, m.minutes, JSON.stringify(m.bullets || []), i],
    );
  }

  for (let i = 0; i < ROLES.length; i += 1) {
    const r = ROLES[i];
    await client.query(
      `INSERT INTO intl_pathway_roles
        (name, blurb, "reqExclude", "reqAdd", "reqNote", scores, "sortOrder", deleted)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb,$7,false)`,
      [
        r.name,
        r.blurb,
        JSON.stringify(r.reqExclude || []),
        JSON.stringify(r.reqAdd || []),
        r.reqNote || null,
        JSON.stringify(r.scores || {}),
        i,
      ],
    );
  }

  const mc = await client.query('SELECT count(*)::int AS c FROM intl_pathway_modules');
  const rc = await client.query('SELECT count(*)::int AS c FROM intl_pathway_roles');
  console.log(`Reseeded modules=${mc.rows[0].c} roles=${rc.rows[0].c}`);
  const sample = await client.query(
    'SELECT code, title FROM intl_pathway_modules ORDER BY "sortOrder" ASC LIMIT 5',
  );
  console.log(sample.rows);
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
