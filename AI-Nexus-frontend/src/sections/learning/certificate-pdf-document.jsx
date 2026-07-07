import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
  },
  border: {
    flex: 1,
    borderWidth: 3,
    borderImage: 'linear-gradient(to right, darkblue, darkorchid) 1',
    padding: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    height: 96,
    objectFit: 'contain',
    marginBottom: 16,
  },
  badge: {
    width: 72,
    height: 72,
    objectFit: 'contain',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  body: {
    alignItems: 'center',
    marginVertical: 32,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 11,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 1.5,
    maxWidth: 400,
  },
  meta: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    flexWrap: 'wrap',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    color: '#9ca3af',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 48,
    right: 48,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  transcriptPage: {
    padding: 48,
    fontFamily: 'Helvetica',
  },
  transcriptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  transcriptSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 20,
  },
  pillarGroupTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 2,
    marginTop: 4,
  },
  pillarGroupCourse: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 1.35,
  },
  moduleBlock: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  moduleTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  moduleMeta: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 6,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
    paddingLeft: 8,
  },
  sectionBullet: {
    fontSize: 9,
    color: '#059669',
    width: 12,
  },
  sectionTitle: {
    fontSize: 9,
    color: '#374151',
    flex: 1,
  },
});

function formatCpeForPdf(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
  return `${text} CPE Hour${rounded === 1 ? '' : 's'}`;
}

function groupTranscriptForPdf(transcript = []) {
  const modules = (Array.isArray(transcript) ? transcript : []).filter(
    (module) => module?.isModuleComplete || module?.completedSections > 0
  );
  if (!modules.length) return [];

  const hasPillars = modules.some((module) => module?.pillarIndex != null && module.pillarIndex > 0);
  if (!hasPillars) {
    return [
      {
        key: 'course',
        pillarLabel: null,
        courseTitle: modules[0]?.courseTitle || 'Course',
        modules,
      },
    ];
  }

  const groups = new Map();
  modules.forEach((module) => {
    const pillarIndex = Number(module.pillarIndex) || 0;
    const key = String(pillarIndex);
    if (!groups.has(key)) {
      const pillarLabel = pillarIndex > 0 ? `Pillar ${pillarIndex}` : 'Course';
      const courseTitle = module.courseTitle || '';
      groups.set(key, {
        key,
        pillarLabel: pillarIndex > 0 ? pillarLabel : null,
        courseTitle,
        modules: [],
      });
    }
    groups.get(key).modules.push(module);
  });

  return [...groups.values()].sort(
    (a, b) => Number(a.key) - Number(b.key)
  );
}

function TranscriptPage({ courseTitle, transcript = [] }) {
  const groups = groupTranscriptForPdf(transcript);

  if (!groups.length) return null;

  return (
    <Page size="A4" style={styles.transcriptPage}>
      <Text style={styles.transcriptTitle}>Learning Transcript</Text>
      <Text style={styles.transcriptSubtitle}>{courseTitle}</Text>
      {groups.map((group) => (
        <View key={group.key}>
          {group.pillarLabel ? (
            <Text style={styles.pillarGroupTitle}>{group.pillarLabel}</Text>
          ) : group.courseTitle ? (
            <Text style={styles.pillarGroupTitle}>{group.courseTitle}</Text>
          ) : null}
          {group.pillarLabel && group.courseTitle ? (
            <Text style={styles.pillarGroupCourse}>{group.courseTitle}</Text>
          ) : null}
          {group.modules.map((module) => {
            const completedSections = (module.sections || []).filter((section) => section.isCompleted);
            return (
              <View
                key={`${group.key}-${module.moduleId || module.moduleTitle}`}
                style={styles.moduleBlock}
              >
                <Text style={styles.moduleTitle}>{module.moduleTitle || 'Module'}</Text>
                <Text style={styles.moduleMeta}>
                  {module.completedSections ?? completedSections.length} of{' '}
                  {module.totalSections ?? completedSections.length} lessons completed
                </Text>
                {completedSections.map((section) => (
                  <View key={section.sectionId || section.sectionTitle} style={styles.sectionRow}>
                    <Text style={styles.sectionBullet}>✓</Text>
                    <Text style={styles.sectionTitle}>{section.sectionTitle || 'Lesson'}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </Page>
  );
}

export function CertificatePdfDocument({
  courseTitle,
  learnerName,
  completedAt,
  cpeHours,
  earnedCpeHours,
  logoSource,
  badgeSource,
  certificateNo,
  transcript,
}) {
  const cpeText =
    formatCpeForPdf(earnedCpeHours) ||
    (typeof cpeHours === 'number' ? formatCpeForPdf(cpeHours) : cpeHours);
  const logo = logoSource || '/logo/logo-full.svg';
  const issuedTo = String(learnerName || '').trim() || 'Learner';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.header}>
            <Image source={logo} style={styles.logo} />
            {badgeSource ? <Image source={badgeSource} style={styles.badge} /> : null}
            <Text style={styles.title}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>AI Nexus Learning Platform</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>This is to certify that</Text>
            <Text style={[styles.name, { marginTop: 4, marginBottom: 8 }]}>{issuedTo}</Text>
            <Text style={styles.description}>
              The learner has successfully completed the course
            </Text>
            <Text style={[styles.name, { marginTop: 12, marginBottom: 24 }]}>{courseTitle}</Text>
            <View style={styles.meta}>
              {certificateNo ? (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Certificate No.</Text>
                  <Text style={styles.metaValue}>{certificateNo}</Text>
                </View>
              ) : null}
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Completed on</Text>
                <Text style={styles.metaValue}>{completedAt}</Text>
              </View>
              {cpeText ? (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>CPE Hours Earned</Text>
                  <Text style={styles.metaValue}>{cpeText}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This certificate is issued by AI Nexus. CPE hours reflect verified learning activity.
            </Text>
          </View>
        </View>
      </Page>
      <TranscriptPage courseTitle={courseTitle} transcript={transcript} />
    </Document>
  );
}
