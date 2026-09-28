import { Document, Page, Text, View, StyleSheet, Link, Image } from '@react-pdf/renderer';

export interface InvoicePdfCompanyInfo {
	name: string;
	addressLine1?: string;
	addressLine2?: string;
	email?: string;
	phone?: string;
	website?: string;
	logoUrl?: string;
	registrationNumber?: string;
}

export interface InvoicePdfSocialLink {
	label: string;
	url: string;
}

export interface InvoicePdfItem {
	vin: string;
	lotNumber: string;
	auctionCity: string;
	freightCost: number;
	towingCost: number;
	clearanceCost: number;
	vatCost: number;
	customsCost: number;
	otherCost: number;
	subtotalUSD: number;
	subtotalAED: number;
	vehicleMake?: string;
	vehicleModel?: string;
	vehicleYear?: string | number;
	vehicleType?: string;
	bodyClass?: string;
}

export interface InvoicePdfDetails {
	invoiceNumber: string;
	status?: string;
	issueDate?: string;
	dueDate?: string | null;
	paidDate?: string | null;
	containerNumber?: string;
	billedToName?: string;
	billedToEmail?: string;
	exchangeRate?: number;
	subtotalUSD: number;
	subtotalAED: number;
	totalUSD: number;
	totalAED: number;
	paymentStatusLabel?: string;
	paymentNotes?: string | null;
	wireTransferDetails?: string | null;
	items: InvoicePdfItem[];
	notes?: string;
}

export interface InvoicePdfTemplateProps {
	company: InvoicePdfCompanyInfo;
	invoice: InvoicePdfDetails;
	socialLinks?: InvoicePdfSocialLink[];
}

const styles = StyleSheet.create({
	page: {
		backgroundColor: 'var(--background)',
		padding: 32,
		fontFamily: 'Helvetica',
		fontSize: 11,
		color: 'var(--text-primary)',
	},
	header: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 24,
	},
	companyInfo: {
		flex: 1,
		paddingRight: 16,
	},
	companyName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: 'var(--text-primary)',
		marginBottom: 6,
	},
	companyLine: {
		marginBottom: 3,
		color: 'var(--text-primary)',
	},
	companyLogo: {
		width: 96,
		height: 96,
		objectFit: 'contain',
		marginBottom: 8,
	},
	invoiceMeta: {
		minWidth: 180,
		backgroundColor: 'var(--background)',
		padding: 12,
		borderRadius: 6,
	},
	invoiceMetaLabel: {
		fontSize: 9,
		color: 'var(--text-secondary)',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 4,
	},
	invoiceMetaValue: {
		fontSize: 12,
		fontWeight: 'bold',
		color: 'var(--text-primary)',
		marginBottom: 8,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: 'bold',
		color: 'var(--text-primary)',
		marginBottom: 10,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
	},
	infoRow: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	infoColumn: {
		flex: 1,
		paddingRight: 12,
	},
	infoLabel: {
		fontSize: 9,
		color: 'var(--text-secondary)',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 4,
	},
	infoValue: {
		fontSize: 11,
		color: 'var(--text-primary)',
		marginBottom: 4,
	},
	itemsWrapper: {
		marginTop: 4,
	},
	itemCard: {
		borderWidth: 1,
		borderColor: 'var(--panel)',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		backgroundColor: 'var(--background)',
		shadowColor: 'var(--panel)',
		shadowOpacity: 0.3,
		shadowRadius: 3,
		shadowOffset: { width: 0, height: 2 },
	},
	itemHeader: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 8,
	},
	itemTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		color: 'var(--text-primary)',
	},
	itemSubtitle: {
		fontSize: 9,
		color: 'var(--text-secondary)',
		marginTop: 2,
	},
	itemTag: {
		fontSize: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		color: 'var(--text-primary)',
		backgroundColor: 'var(--panel)',
		paddingVertical: 3,
		paddingHorizontal: 6,
		borderRadius: 6,
	},
	itemMetaRow: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	itemMeta: {
		fontSize: 9,
		color: 'var(--text-secondary)',
	},
	itemMetaLabel: {
		fontSize: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.7,
		color: 'var(--text-secondary)',
		marginBottom: 2,
	},
	itemTotals: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-end',
	},
	itemTotalUsd: {
		fontSize: 11,
		fontWeight: 'bold',
		color: 'var(--accent-gold)',
	},
	itemTotalAed: {
		fontSize: 9,
		color: 'var(--text-secondary)',
		marginTop: 2,
	},
	costGrid: {
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 4,
	},
	costCell: {
		width: '33.33%',
		paddingVertical: 6,
		paddingRight: 8,
	},
	costLabel: {
		fontSize: 8,
		color: 'var(--text-secondary)',
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 2,
	},
	costValue: {
		fontSize: 10,
		color: 'var(--text-primary)',
		fontWeight: 'bold',
	},
	totalsWrapper: {
		marginTop: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: 'var(--panel)',
		borderRadius: 6,
		backgroundColor: 'var(--background)',
		alignSelf: 'flex-end',
		minWidth: 220,
	},
	totalRow: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6,
	},
	totalLabel: {
		fontSize: 11,
		color: 'var(--text-secondary)',
	},
	totalValue: {
		fontSize: 12,
		fontWeight: 'bold',
		color: 'var(--text-primary)',
	},
	totalValueAccent: {
		color: 'var(--accent-gold)',
	},
	notesBox: {
		borderWidth: 1,
		borderColor: 'var(--panel)',
		borderRadius: 6,
		padding: 12,
		backgroundColor: 'var(--background)',
	},
	notesText: {
		fontSize: 10,
		color: 'var(--text-secondary)',
		lineHeight: 1.5,
	},
	footer: {
		marginTop: 'auto',
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: 'var(--panel)',
	},
	socialLinks: {
		display: 'flex',
		flexDirection: 'row',
		gap: 12,
		marginTop: 8,
		flexWrap: 'wrap',
	},
	socialLink: {
		fontSize: 10,
		color: 'var(--accent-gold)',
		textDecoration: 'none',
	},
	footerText: {
		fontSize: 9,
		color: 'var(--text-secondary)',
	},
});

const currencyFormatter = (value: number, currency: 'USD' | 'AED') =>
	new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-AE', {
		style: 'currency',
		currency,
		maximumFractionDigits: 2,
	}).format(value);

const formatUsd = (value: number) => currencyFormatter(value, 'USD');
const formatAed = (value: number) => currencyFormatter(value, 'AED');

const formatDate = (value?: string | null) => {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString();
};

export function InvoicePdfTemplate({ company, invoice, socialLinks = [] }: InvoicePdfTemplateProps) {
	return (
		<Document>
			<Page size="A4" style={styles.page} wrap>
				<View style={styles.header}>
					<View style={styles.companyInfo}>
						{company.logoUrl ? (
							// eslint-disable-next-line jsx-a11y/alt-text
							<Image src={company.logoUrl} style={styles.companyLogo} />
						) : null}
						<Text style={styles.companyName}>{company.name}</Text>
						{company.addressLine1 ? <Text style={styles.companyLine}>{company.addressLine1}</Text> : null}
						{company.addressLine2 ? <Text style={styles.companyLine}>{company.addressLine2}</Text> : null}
						{company.phone ? <Text style={styles.companyLine}>Phone: {company.phone}</Text> : null}
						{company.email ? <Text style={styles.companyLine}>Email: {company.email}</Text> : null}
						{company.website ? <Text style={styles.companyLine}>Website: {company.website}</Text> : null}
						{company.registrationNumber ? (
							<Text style={styles.companyLine}>Registration: {company.registrationNumber}</Text>
						) : null}
					</View>
					<View style={styles.invoiceMeta}>
						<Text style={styles.invoiceMetaLabel}>Invoice Number</Text>
						<Text style={styles.invoiceMetaValue}>{invoice.invoiceNumber}</Text>
						<Text style={styles.invoiceMetaLabel}>Status</Text>
						<Text style={styles.invoiceMetaValue}>{invoice.paymentStatusLabel || invoice.status || 'Pending'}</Text>
						<Text style={styles.invoiceMetaLabel}>Issue Date</Text>
						<Text style={styles.invoiceMetaValue}>{formatDate(invoice.issueDate ?? invoice.paidDate ?? undefined)}</Text>
						<Text style={styles.invoiceMetaLabel}>Due Date</Text>
						<Text style={styles.invoiceMetaValue}>{formatDate(invoice.dueDate)}</Text>
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.infoRow}>
						<View style={styles.infoColumn}>
							<Text style={styles.infoLabel}>Billed To</Text>
							<Text style={styles.infoValue}>{invoice.billedToName || 'Customer'}</Text>
							{invoice.billedToEmail ? <Text style={styles.infoValue}>{invoice.billedToEmail}</Text> : null}
						</View>
						<View style={styles.infoColumn}>
							<Text style={styles.infoLabel}>Container</Text>
							<Text style={styles.infoValue}>{invoice.containerNumber || 'N/A'}</Text>
							{invoice.exchangeRate ? (
								<Text style={styles.infoValue}>Exchange Rate (USD → AED): {invoice.exchangeRate.toFixed(4)}</Text>
							) : null}
						</View>
						<View style={styles.infoColumn}>
							<Text style={styles.infoLabel}>Payment Details</Text>
							<Text style={styles.infoValue}>{invoice.paymentNotes || 'Payment due upon receipt'}</Text>
							{invoice.wireTransferDetails ? (
								<Text style={styles.infoValue}>{invoice.wireTransferDetails}</Text>
							) : null}
						</View>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Itemized Breakdown</Text>
					<View style={styles.itemsWrapper}>
						{invoice.items.map((item, index) => (
							<View key={`${item.vin}-${index}`} style={styles.itemCard}>
								<View style={styles.itemHeader}>
									<View>
										<Text style={styles.itemTitle}>{item.vin}</Text>
										<Text style={styles.itemSubtitle}>Lot #{item.lotNumber}</Text>
										{(item.vehicleMake || item.vehicleModel || item.vehicleYear) && (
											<Text style={styles.itemSubtitle}>
												{[item.vehicleYear, item.vehicleMake, item.vehicleModel].filter(Boolean).join(' ')}
											</Text>
										)}
									</View>
									<View>
										<Text style={styles.itemTag}>Auction</Text>
										<Text style={[styles.itemSubtitle, { marginTop: 4 }]}>{item.auctionCity}</Text>
										{item.vehicleType ? (
											<Text style={[styles.itemSubtitle, { marginTop: 2 }]}>{item.vehicleType}</Text>
										) : null}
										{item.bodyClass ? (
											<Text style={[styles.itemSubtitle, { marginTop: 2 }]}>{item.bodyClass}</Text>
										) : null}
									</View>
								</View>

								<View style={styles.itemMetaRow}>
									<View>
										<Text style={styles.itemMetaLabel}>USD Subtotal</Text>
										<Text style={styles.itemTotalUsd}>{formatUsd(item.subtotalUSD)}</Text>
									</View>
									<View style={styles.itemTotals}>
										<Text style={styles.itemMetaLabel}>AED Subtotal</Text>
										<Text style={styles.itemTotalAed}>{formatAed(item.subtotalAED)}</Text>
									</View>
								</View>

								<View style={styles.costGrid}>
									<View style={styles.costCell}>
										<Text style={styles.costLabel}>Freight</Text>
										<Text style={styles.costValue}>{formatUsd(item.freightCost)}</Text>
									</View>
									<View style={styles.costCell}>
										<Text style={styles.costLabel}>Towing</Text>
										<Text style={styles.costValue}>{formatUsd(item.towingCost)}</Text>
									</View>
									<View style={styles.costCell}>
										<Text style={styles.costLabel}>Clearance</Text>
										<Text style={styles.costValue}>{formatUsd(item.clearanceCost)}</Text>
									</View>
									<View style={styles.costCell}>
										<Text style={styles.costLabel}>VAT</Text>
										<Text style={styles.costValue}>{formatUsd(item.vatCost)}</Text>
									</View>
									<View style={styles.costCell}>
										<Text style={styles.costLabel}>Customs</Text>
										<Text style={styles.costValue}>{formatUsd(item.customsCost)}</Text>
									</View>
									<View style={styles.costCell}>
										<Text style={styles.costLabel}>Other</Text>
										<Text style={styles.costValue}>{formatUsd(item.otherCost)}</Text>
									</View>
								</View>
							</View>
						))}
					</View>

					<View style={styles.totalsWrapper}>
						<View style={styles.totalRow}>
							<Text style={styles.totalLabel}>Subtotal (USD)</Text>
							<Text style={styles.totalValue}>{currencyFormatter(invoice.subtotalUSD, 'USD')}</Text>
						</View>
						<View style={styles.totalRow}>
							<Text style={styles.totalLabel}>Subtotal (AED)</Text>
							<Text style={styles.totalValue}>{currencyFormatter(invoice.subtotalAED, 'AED')}</Text>
						</View>
						<View style={styles.totalRow}>
							<Text style={styles.totalLabel}>Total (USD)</Text>
							<Text style={[styles.totalValue, styles.totalValueAccent]}>
								{currencyFormatter(invoice.totalUSD, 'USD')}
							</Text>
						</View>
						<View style={styles.totalRow}>
							<Text style={styles.totalLabel}>Total (AED)</Text>
							<Text style={[styles.totalValue, styles.totalValueAccent]}>
								{currencyFormatter(invoice.totalAED, 'AED')}
							</Text>
						</View>
					</View>
				</View>

				{invoice.notes ? (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Notes</Text>
						<View style={styles.notesBox}>
							<Text style={styles.notesText}>{invoice.notes}</Text>
						</View>
					</View>
				) : null}

				<View style={styles.footer}>
					<Text style={styles.footerText}>
						Thank you for choosing {company.name}. We appreciate your business and look forward to serving you
						again.
					</Text>
					{socialLinks.length ? (
						<View style={styles.socialLinks}>
							{socialLinks.map((social) => (
								<Link key={social.url} src={social.url} style={styles.socialLink}>
									{social.label}
								</Link>
							))}
						</View>
					) : null}
				</View>
			</Page>
		</Document>
	);
}


