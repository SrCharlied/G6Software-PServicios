import { StyleSheet } from 'react-native';
import { T } from '../../theme';

/**
 * Estilos compartidos del panel de proveedor.
 *
 * Se movieron tal cual desde ProviderDashboardScreen: este refactor divide el
 * archivo, no rediseña la pantalla. Los estilos que solo usa un componente
 * (TimePickerModal, OpportunityCard, filtros de oportunidades) viven junto a
 * ese componente.
 */
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: T.muted },

  codigoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  codigoSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  codigoTitle:    { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  codigoSubtitle: { fontSize: 13, color: '#667085', marginBottom: 18, lineHeight: 18 },
  codigoTextInput: {
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: '#0e1424',
  },
  codigoInputError:  { borderColor: '#c0392b', backgroundColor: '#fff5f5' },
  codigoErrorText:   { color: '#c0392b', fontSize: 12, marginTop: 6 },
  codigoActions:     { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  codigoCancelBtn:   { paddingVertical: 11, paddingHorizontal: 16 },
  codigoCancelText:  { color: '#667085', fontWeight: '600', fontSize: 15 },
  codigoConfirmBtn:  { backgroundColor: '#4589d4', paddingVertical: 11, paddingHorizontal: 22, borderRadius: 8, minWidth: 110, alignItems: 'center' },
  codigoConfirmBtnDisabled: { opacity: 0.6 },
  codigoConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  codigoFinModalLoader: { paddingVertical: 30, alignItems: 'center' },
  codigoFinModalBox: {
    marginTop: 6,
    backgroundColor: '#e3f0ff',
    borderRadius: 10,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  codigoFinModalValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0e1424',
    letterSpacing: 10,
  },
  codigoFinModalHint: {
    marginTop: 14,
    fontSize: 12,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 17,
  },

  codigoFinBox: {
    marginTop: 12,
    backgroundColor: '#fff4e0',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  codigoFinLabel: { fontSize: 11, color: '#b76e00', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  codigoFinValue: { fontSize: 28, fontWeight: '800', color: '#0e1424', letterSpacing: 6, marginTop: 4 },
  codigoFinHint:  { fontSize: 11, color: '#7a5200', marginTop: 6, textAlign: 'center' },

  // Header gradient
  header: {
    borderRadius: T.rLg,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: T.s4,
    overflow: 'hidden',
    ...T.sh1,
  },
  headerGreet: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.78)', letterSpacing: 0.3 },
  headerTitle: { marginTop: 4, fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.4, lineHeight: 28 },
  headerPremium: { marginTop: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  headerStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  headerStatusOff: { backgroundColor: 'rgba(255,255,255,0.12)' },
  headerStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22d3a8' },
  headerStatusDotOff: { backgroundColor: '#fda4af' },
  headerStatusText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headerSaldo: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  headerSaldoLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.82)' },
  headerSaldoValue: { fontSize: 13, fontWeight: '800', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  headerGhostBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: T.rSm,
  },
  headerGhostBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  logoutBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: T.rSm },
  logoutBtnText: { color: T.deep, fontWeight: '700', fontSize: 13 },

  emptyCard: { backgroundColor: T.white, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  emptyCardTitle: { fontSize: 18, fontWeight: '700', color: T.ink, marginBottom: 8 },
  emptyCardText: { fontSize: 14, color: T.muted, textAlign: 'center', marginBottom: 18, lineHeight: 20 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: T.s3, marginBottom: T.s4 },
  summaryCard: { flex: 1, backgroundColor: T.white, borderRadius: T.rMd, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: T.border, ...T.sh1 },
  summaryNumber: { fontSize: 28, fontWeight: '800', color: T.blue, letterSpacing: -0.6 },
  summaryLabel: { marginTop: 6, fontSize: 11, color: T.muted, fontWeight: '700', letterSpacing: 0.5 },

  // Card
  card: { backgroundColor: T.white, borderRadius: T.rMd, padding: T.s4, marginBottom: T.s4, borderWidth: 1, borderColor: T.border, ...T.sh1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },
  cardSubtitle: { fontSize: 13, color: T.muted, marginBottom: 12, lineHeight: 18 },
  linkText: { color: T.blue, fontWeight: '700', fontSize: 13 },

  // Profile
  profileCover: { width: 'auto', alignSelf: 'stretch', marginTop: -T.s4, marginHorizontal: -T.s4, marginBottom: 12 },
  profileName: { fontSize: 18, fontWeight: '700', color: T.ink, marginBottom: 8 },
  profilePremium: { marginBottom: 12 },
  profileDescription: { fontSize: 14, color: T.text, lineHeight: 20, opacity: 0.78 },
  profileMetaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  profileMeta: { backgroundColor: 'rgba(69,137,212,0.10)', color: T.deep, fontSize: 12, fontWeight: '600', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },

  // Documentos
  tipoSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.paper, borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 8, gap: 8 },
  tipoSelectorLabel: { fontSize: 13, fontWeight: '600', color: T.muted },
  tipoSelectorValue: { flex: 1, fontSize: 13, color: T.text },
  tipoSelectorArrow: { fontSize: 12, color: T.faint },
  tipoList: { backgroundColor: T.white, borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, marginBottom: 12, overflow: 'hidden' },
  tipoOption: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.paper },
  tipoOptionActive: { backgroundColor: 'rgba(69,137,212,0.08)' },
  tipoOptionText: { fontSize: 13, color: T.text },
  tipoOptionTextActive: { color: T.deep, fontWeight: '600' },
  uploadBtn: { backgroundColor: T.blue, padding: 13, borderRadius: T.rSm, alignItems: 'center', marginBottom: 16 },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  uploadInfo: { borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, padding: 12, marginBottom: 12, backgroundColor: T.paper },
  uploadInfoText: { color: T.muted, fontSize: 13 },
  documentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.paper },
  documentInfo: { flex: 1 },
  documentType: { fontSize: 12, fontWeight: '700', color: T.ink, marginBottom: 3 },
  documentName: { fontSize: 13, color: T.muted },
  emptyInlineText: { fontSize: 14, color: T.faint, textAlign: 'center', paddingVertical: 12 },

  // Tabs
  tabsRow: { gap: 8, paddingBottom: 12 },
  tabBtn: { backgroundColor: T.white, borderWidth: 1, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  tabBtnActive: { backgroundColor: T.blue, borderColor: T.blue, ...T.sh2 },
  tabBtnText: { color: T.muted, fontWeight: '600', fontSize: 13 },
  tabBtnTextActive: { color: '#fff' },

  // Sections
  sectionStack: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },
  subsectionTitle: { fontSize: 13, fontWeight: '700', color: T.muted, marginTop: 12, letterSpacing: 0.6 },
  historyCounter: { fontSize: 13, color: T.muted, fontWeight: '500' },
  sectionLoader: { marginVertical: 12 },
  emptyState: { borderWidth: 1, borderColor: T.inputBorder, borderStyle: 'dashed', borderRadius: T.rMd, padding: 20, alignItems: 'center', backgroundColor: T.white },
  emptyStateText: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20 },

  // Service card
  serviceCard: { borderWidth: 1, borderColor: T.border, borderRadius: T.rMd, padding: 16, backgroundColor: T.white },
  serviceCardCompact: { backgroundColor: T.white },
  serviceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  serviceTopInfo: { flex: 1 },
  serviceClient: { fontSize: 15, fontWeight: '700', color: T.ink },
  serviceCategory: { fontSize: 12, color: T.muted, marginTop: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize', letterSpacing: 0.2 },
  serviceDescription: { fontSize: 14, color: T.text, lineHeight: 21, marginBottom: 12, opacity: 0.82 },
  serviceMetaGrid: { gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.paper },
  serviceMeta: { fontSize: 12, color: T.muted },

  reasonBox: { marginTop: 12, padding: 12, borderRadius: T.rSm, backgroundColor: '#fef2f2', borderLeftWidth: 3, borderLeftColor: T.danger },
  reasonLabel: { fontSize: 10, fontWeight: '700', color: '#991b1b', marginBottom: 3, letterSpacing: 0.6 },
  reasonText: { fontSize: 13, color: '#991b1b', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  acceptBtn: { backgroundColor: T.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: T.rSm },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: T.rSm },
  rejectBtnText: { color: T.danger, fontWeight: '700', fontSize: 13 },
  advanceBtn: { backgroundColor: T.blue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: T.rSm },
  advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabledBlock: { opacity: 0.6 },

  // Rating
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: T.rMd, backgroundColor: T.white, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.blue },
  ratingAverage: { fontSize: 42, fontWeight: '800', color: T.blue, letterSpacing: -1.4 },
  ratingSummaryText: { fontSize: 13, color: T.muted, marginTop: 4 },
  starsRow: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 16, fontWeight: '700' },
  starOn: { color: T.amber },
  starOff: { color: '#cbd5e1' },

  reviewCard: { borderWidth: 1, borderColor: T.border, borderRadius: T.rMd, padding: 16, backgroundColor: T.white },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAuthor: { fontSize: 14, fontWeight: '700', color: T.ink },
  reviewComment: { fontSize: 14, color: T.text, lineHeight: 20, opacity: 0.82 },
  reviewMuted: { fontSize: 13, color: T.faint, fontStyle: 'italic' },

  // Schedule
  scheduleRow: { borderWidth: 1, borderColor: T.border, borderRadius: T.rMd, padding: 12, gap: 10, backgroundColor: T.white },
  scheduleRowOn: { borderColor: T.soft, backgroundColor: T.white },
  dayToggle: { borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: T.white },
  dayToggleActive: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  dayToggleText: { fontSize: 14, fontWeight: '600', color: T.muted },
  dayToggleTextActive: { color: '#065f46' },

  timeInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.white, borderWidth: 1, borderColor: T.inputBorder,
    borderRadius: T.rSm, paddingHorizontal: 12, paddingVertical: 10,
  },
  timePickerDisabled: { backgroundColor: '#f3f2ec', borderColor: T.inputBorder },
  timePickerValue: { fontSize: 14, fontWeight: '600', color: T.text },
  timePickerValueDisabled: { color: T.faint },
  timePickerArrow: { fontSize: 11, color: T.faint },
  timeDivider: { color: T.muted, fontSize: 13, fontWeight: '600' },

  primaryBtn: { backgroundColor: T.blue, padding: 14, borderRadius: T.rSm, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryHomeBtn: { backgroundColor: T.paper, padding: 14, borderRadius: T.rSm, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  secondaryHomeBtnText: { color: T.ink, fontWeight: '700', fontSize: 14 },

  // Chat
  chatClientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.white, borderRadius: T.rMd, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: T.border, gap: 12 },
  chatClientAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.blue, justifyContent: 'center', alignItems: 'center' },
  chatClientAvatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  chatClientName: { flex: 1, fontSize: 15, fontWeight: '600', color: T.ink },
  chatArrow: { fontSize: 18, color: T.blue, fontWeight: '700' },
});

export default styles;
