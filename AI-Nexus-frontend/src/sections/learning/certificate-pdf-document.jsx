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
    // borderColor: '#d97706',
    borderImage: 'linear-gradient(to right, darkblue, darkorchid) 1',
    padding: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    // width: 140,
    // height: 48,
    height: 96,
    objectFit: 'contain',
    marginBottom: 16,
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
});

export function CertificatePdfDocument({ courseTitle, completedAt, cpeHours, logoSource }) {
  const cpeText = typeof cpeHours === 'number' ? `${cpeHours} CPE Hour${cpeHours !== 1 ? 's' : ''}` : cpeHours;
  const logo = logoSource || '/logo/logo-full.png';
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.header}>
            <Image source={logo} style={styles.logo} />
            <Text style={styles.title}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>AI Nexus Learning Platform</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>This is to certify that</Text>
            <Text style={styles.description}>
              The learner has successfully completed the course
            </Text>
            <Text style={[styles.name, { marginTop: 12, marginBottom: 24 }]}>{courseTitle}</Text>
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Completed on</Text>
                <Text style={styles.metaValue}>{completedAt}</Text>
              </View>
              {cpeText !== '—' && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>CPE Hours</Text>
                  <Text style={styles.metaValue}>{cpeText}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This certificate is issued by AI Nexus. Verify completion through your learning dashboard.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
