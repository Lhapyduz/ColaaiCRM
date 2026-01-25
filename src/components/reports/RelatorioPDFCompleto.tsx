import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Interface defining the structure of the report data
export interface ReportData {
    businessName?: string;
    periodoSelecionado: string;
    secoes: {
        titulo: string;
        tipo: 'kpi' | 'tabela' | 'lista';
        dados: any[];
        colunas?: { header: string; key: string; width?: string }[];
    }[];
    comparacao?: {
        periodo: string;
        dados: any;
    };
}

// Dark Theme - Polished
const theme = {
    colors: {
        background: '#0F1115',
        text: '#FFFFFF',
        secondary: '#A1A1AA',
        accent: '#FF6600', // Preserved for brand touch
        border: '#27272A',
        surface: '#18181B', // Slightly lighter for headers?
    },
    spacing: {
        sm: 10,
        md: 20,
        lg: 40,
    },
    fonts: {
        bold: 'Helvetica-Bold',
        regular: 'Helvetica',
        italic: 'Helvetica-Oblique',
    },
};

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        fontFamily: theme.fonts.regular,
        fontSize: 11,
        color: theme.colors.text,
        lineHeight: 1.5,
    },
    // Brand Line
    brandLine: {
        height: 4,
        backgroundColor: theme.colors.accent,
        marginBottom: 30,
        width: 60,
    },
    // Header
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start', // Changed from space-between
        alignItems: 'center',
        marginBottom: 30, // Reduced margin
        height: 'auto', // Auto height instead of fixed 100
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'column',
    },
    h1: {
        fontSize: 22, // Larger
        fontFamily: theme.fonts.bold,
        textTransform: 'uppercase',
        color: theme.colors.text,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: theme.fonts.regular,
        color: theme.colors.secondary,
        textTransform: 'uppercase'
    },

    // Sections
    section: {
        marginBottom: 35,
    },
    sectionTitle: {
        fontSize: 13,
        fontFamily: theme.fonts.bold,
        color: theme.colors.accent, // Accent color for section headers
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Metric Rows
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    metricLabel: {
        fontSize: 11,
        color: theme.colors.secondary,
    },
    metricValue: {
        fontSize: 11,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text,
    },

    // Table Header
    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        marginBottom: 0,
    },
    tableHeaderLabel: {
        fontSize: 10,
        fontFamily: theme.fonts.bold,
        color: theme.colors.secondary,
        textTransform: 'uppercase',
    },

    // Lists
    listItem: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
    },
    bullet: {
        width: 4,
        height: 4,
        backgroundColor: theme.colors.accent, // Orange bullet
        borderRadius: 2,
        marginRight: 10,
    },
    listText: {
        fontSize: 11,
        color: theme.colors.text,
    },
});

const MetricRows = ({ data }: { data: any[] }) => (
    <View>
        <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderLabel}>Métrica</Text>
            <Text style={styles.tableHeaderLabel}>Valor</Text>
        </View>

        {data.map((item, index) => (
            <View key={index} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{item.label || item.produto || 'Item'}</Text>
                <Text style={styles.metricValue}>{item.value || item.total || '-'}</Text>
            </View>
        ))}
    </View>
);

const GenericTable = ({ data, columns }: { data: any[]; columns?: any[] }) => {
    const cols = columns || (data.length > 0 ? Object.keys(data[0]).map(key => ({ header: key, key })) : []);

    return (
        <View>
            <View style={styles.tableHeader}>
                {cols.map((col, i) => (
                    <Text key={i} style={[styles.tableHeaderLabel, col.width ? { flexBasis: col.width } : { flex: 1, textAlign: i === cols.length - 1 ? 'right' : 'left' }]}>
                        {col.header}
                    </Text>
                ))}
            </View>
            {data.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.metricRow}>
                    {cols.map((col, colIndex) => (
                        <Text key={colIndex} style={[
                            colIndex === 0 ? styles.metricLabel : styles.metricValue,
                            col.width ? { flexBasis: col.width } : { flex: 1, textAlign: colIndex === cols.length - 1 ? 'right' : 'left' }
                        ]}>
                            {String(row[col.key] || '')}
                        </Text>
                    ))}
                </View>
            ))}
        </View>
    );
};

const BulletList = ({ data }: { data: any[] }) => (
    <View>
        {data.map((item, index) => (
            <View key={index} style={styles.listItem}>
                <View style={styles.bullet} />
                <Text style={styles.listText}>
                    {typeof item === 'string' ? item : (item.label ? `${item.label}: ${item.value}` : JSON.stringify(item))}
                </Text>
            </View>
        ))}
    </View>
);

const RelatorioPDFCompleto: React.FC<{ reportData: ReportData }> = ({ reportData }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Decorative Brand Line */}
                <View style={styles.brandLine} />

                {/* Header Block with Logo */}
                <View style={styles.headerRow}>
                    <View style={styles.headerContent}>
                        <Text style={styles.h1}>RELATÓRIO MENSAL</Text>
                        <Text style={styles.subtitle}>
                            {reportData.businessName || 'SEU NEGÓCIO'} • {reportData.periodoSelecionado.replace('Este Mês (', '').replace(')', '')}
                        </Text>
                    </View>
                </View>

                {/* Dynamic Content */}
                {reportData.secoes.map((secao, index) => (
                    <View key={index} style={styles.section}>

                        {secao.titulo && <Text style={styles.sectionTitle}>{secao.titulo}</Text>}

                        {secao.tipo === 'kpi' && <MetricRows data={secao.dados} />}
                        {secao.tipo === 'tabela' && <GenericTable data={secao.dados} columns={secao.colunas} />}
                        {secao.tipo === 'lista' && <BulletList data={secao.dados} />}

                    </View>
                ))}

                {/* Footer */}
                <View style={{ position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#27272A', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }} fixed>
                    <Text style={{ fontSize: 9, color: '#555' }}>
                        Gerado em {new Date().toLocaleDateString('pt-BR')} por {reportData.businessName}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#555' }} render={({ pageNumber, totalPages }) => (
                        `${pageNumber} / ${totalPages}`
                    )} />
                </View>

            </Page>
        </Document>
    );
};

export default RelatorioPDFCompleto;
