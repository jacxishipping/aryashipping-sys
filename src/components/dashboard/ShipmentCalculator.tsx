'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useEffect, useState } from 'react';
import { Button, Select, FormField } from '@/components/design-system';
import { Calculator, MapPin, Truck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    type AuctionRateEntry,
    DEFAULT_SHIPPING_RATE_CONFIG,
    US_STATES,
    type ShippingRateCalculatorConfig,
    normalizeShippingRateConfig,
} from '@/lib/shipping-rate-calculator';
import { buildAverageCompanyRateEstimate } from '@/lib/shipping-rate-average';

type CompanyRateOption = {
    id: string;
    name: string;
    priceListConfig?: ShippingRateCalculatorConfig | null;
    priceLists?: Array<{
        id: string;
        name: string;
        importedAuctionRateCount: number;
        importedStateRateCount: number;
        destinationLabel: string;
        sourceFileName: string;
        createdAt: string;
    }>;
};

type CalculationTrace = {
    companyName: string;
    priceListName: string;
    priceListId: string;
    sourceFileName: string;
    baseRate: number;
    multiplier: number;
    rowSource: string;
    rowConfidence: string;
    laneLabel: string;
    averagedCompanyCount?: number;
    matchedAuctionRows?: number;
    matchLevel?: 'lane' | 'state' | 'none';
};

export default function ShipmentCalculator() {
    const [origin, setOrigin] = useState('');
    const [pickupLocation, setPickupLocation] = useState('');
    const [vehicleType, setVehicleType] = useState('sedan');
    const [pickupCity, setPickupCity] = useState('');
    const [pickupBranch, setPickupBranch] = useState('');
    const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
    const [config, setConfig] = useState<ShippingRateCalculatorConfig>(DEFAULT_SHIPPING_RATE_CONFIG);
    const [defaultConfig, setDefaultConfig] = useState<ShippingRateCalculatorConfig>(DEFAULT_SHIPPING_RATE_CONFIG);
    const [companies, setCompanies] = useState<CompanyRateOption[]>([]);
    const [companyId, setCompanyId] = useState('');
    const [calculationTrace, setCalculationTrace] = useState<CalculationTrace | null>(null);

    const stateAuctionRates = config.auctionRates.filter((rate) => rate.stateCode === origin);
    const selectedCompany = companies.find((company) => company.id === companyId);
    const activeCompanyPriceList = selectedCompany?.priceLists?.[0];
    const allCompanyEstimate = origin && !companyId
        ? buildAverageCompanyRateEstimate(
            companies.map((company) => {
                const activeList = company.priceLists?.[0];
                return {
                    companyId: company.id,
                    companyName: company.name,
                    priceListId: activeList?.id || null,
                    priceListName: activeList?.name || null,
                    sourceFileName: activeList?.sourceFileName || null,
                    config: company.priceListConfig,
                };
            }),
            origin,
            { city: pickupCity, branch: pickupBranch },
        )
        : null;

    useEffect(() => {
        let isMounted = true;

        fetch('/api/settings/shipping-rates', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (isMounted && data?.config) {
                    setConfig(data.config);
                    setDefaultConfig(data.config);
                    setVehicleType(data.config.vehicleTypes?.[0]?.id || 'sedan');
                }
            })
            .catch(() => {
                if (isMounted) setConfig(DEFAULT_SHIPPING_RATE_CONFIG);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        fetch('/api/finance/companies?active=true&companyType=SHIPPING', { cache: 'no-store' })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (isMounted) setCompanies(data?.companies || []);
            })
            .catch(() => {
                if (isMounted) setCompanies([]);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!companyId) {
            setConfig(defaultConfig);
            setEstimatedCost(null);
            setCalculationTrace(null);
            setPickupLocation('');
            return;
        }

        const selectedCompany = companies.find((company) => company.id === companyId);
        setConfig(normalizeShippingRateConfig(selectedCompany?.priceListConfig));
        setEstimatedCost(null);
        setCalculationTrace(null);
        setPickupLocation('');
        setPickupCity('');
        setPickupBranch('');
    }, [companies, companyId, defaultConfig]);

    const handleCalculate = () => {
        if (!origin) return;
        
        const selectedAuctionRate = pickupLocation
            ? stateAuctionRates[Number(pickupLocation)]
            : null;
        const averagedBaseRate = !companyId ? allCompanyEstimate?.averageBaseRate : null;
        const baseRate = averagedBaseRate || selectedAuctionRate?.total || config.stateRates[origin] || config.fallbackRate;
        const multiplier = config.vehicleTypes.find(v => v.id === vehicleType)?.multiplier || 1;
        
        setEstimatedCost(Math.round(baseRate * multiplier));
        setCalculationTrace({
            companyName: selectedCompany?.name || (averagedBaseRate ? 'All active shipping companies' : 'Default dashboard rates'),
            priceListName: activeCompanyPriceList?.name || 'Default rate settings',
            priceListId: activeCompanyPriceList?.id || (averagedBaseRate ? 'average' : 'settings'),
            sourceFileName: activeCompanyPriceList?.sourceFileName || (averagedBaseRate ? 'active company price lists' : config.updatedFromPdfName || 'manual settings'),
            baseRate,
            multiplier,
            rowSource: averagedBaseRate ? 'company average' : selectedAuctionRate?.source || (selectedAuctionRate ? 'uploaded row' : config.stateRates[origin] ? 'state rate' : 'fallback rate'),
            rowConfidence: averagedBaseRate ? 'high' : selectedAuctionRate?.confidence || (selectedAuctionRate ? 'unknown' : 'high'),
            laneLabel: averagedBaseRate
                ? `${origin} ${allCompanyEstimate?.matchLevel === 'lane' ? 'lane' : 'state'} average from ${allCompanyEstimate?.companyCount || 0} company price list${allCompanyEstimate?.companyCount === 1 ? '' : 's'}`
                : selectedAuctionRate ? formatAuctionRateLabel(selectedAuctionRate) : `${origin} state rate`,
            averagedCompanyCount: allCompanyEstimate?.companyCount,
            matchedAuctionRows: allCompanyEstimate?.matchedAuctionRows,
            matchLevel: allCompanyEstimate?.matchLevel,
        });
    };

    const formatAuctionRateLabel = (rate: AuctionRateEntry) => {
        const location = [rate.branch, rate.city].filter(Boolean).join(' - ');
        const loadingPoint = rate.loadingPoint ? ` to ${rate.loadingPoint}` : '';
        return `${location || rate.stateCode}${loadingPoint} (${formatCurrency(rate.total)})`;
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--background)] h-full flex flex-col">
            <div className="p-6 border-b border-[var(--border)] flex items-center gap-4 bg-[var(--panel)]">
                <div className="p-3 rounded-xl bg-[var(--accent-gold)] text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Calculator size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight m-0">
                        Quick Rate Calculator
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] m-0">
                        Instant quote to {config.destinationLabel}
                    </p>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-5">
                {/* Route Visual */}
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                            From
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin size={16} className="text-red-500" />
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {origin ? US_STATES.find(s => s.code === origin)?.name : 'Origin (USA)'}
                            </span>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-[var(--text-secondary)]" />
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                            To
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin size={16} className="text-green-500" />
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {config.destinationLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Company Rate Sheet"
                        value={companyId}
                        onChange={(value) => {
                            setCompanyId(String(value));
                            setOrigin('');
                            setPickupLocation('');
                            setPickupCity('');
                            setPickupBranch('');
                            setEstimatedCost(null);
                            setCalculationTrace(null);
                        }}
                        size="small"
                        options={[
                            { value: '', label: 'Average of all active company price lists' },
                            ...companies.map((company) => {
                                const activeList = company.priceLists?.[0];
                                const rowCount = activeList
                                    ? activeList.importedAuctionRateCount || activeList.importedStateRateCount
                                    : company.priceListConfig?.auctionRates?.length || 0;
                                return {
                                    value: company.id,
                                    label: `${company.name}${rowCount ? ` (${rowCount} rows)` : ' (no uploaded list)'}`,
                                };
                            }),
                        ]}
                    />

                    <Select
                        label="Pickup State"
                        value={origin}
                        onChange={(value) => {
                            setOrigin(String(value));
                            setPickupLocation('');
                            setEstimatedCost(null);
                            setCalculationTrace(null);
                        }}
                        size="small"
                        options={US_STATES.map((state) => ({
                            value: state.code,
                            label: `${state.name} (${state.code})`,
                        }))}
                    />

                    {stateAuctionRates.length > 0 && (
                        <Select
                            label="Pickup Location"
                            value={pickupLocation}
                            onChange={(value) => {
                                setPickupLocation(String(value));
                                setEstimatedCost(null);
                                setCalculationTrace(null);
                            }}
                            size="small"
                            options={[
                                { value: '', label: `Lowest state rate (${formatCurrency(config.stateRates[origin] || config.fallbackRate)})` },
                                ...stateAuctionRates.map((rate, index) => ({
                                    value: String(index),
                                    label: formatAuctionRateLabel(rate),
                                })),
                            ]}
                        />
                    )}

                    {!companyId && (
                        <>
                            <FormField
                                label="Pickup City"
                                value={pickupCity}
                                onChange={(event) => {
                                    setPickupCity(event.target.value);
                                    setEstimatedCost(null);
                                    setCalculationTrace(null);
                                }}
                                placeholder="Los Angeles"
                            />
                            <FormField
                                label="Auction Branch"
                                value={pickupBranch}
                                onChange={(event) => {
                                    setPickupBranch(event.target.value);
                                    setEstimatedCost(null);
                                    setCalculationTrace(null);
                                }}
                                placeholder="Los Angeles"
                            />
                        </>
                    )}

                    <Select
                        label="Vehicle Type"
                        value={vehicleType}
                        onChange={(value) => {
                            setVehicleType(String(value));
                            setEstimatedCost(null);
                            setCalculationTrace(null);
                        }}
                        size="small"
                        options={config.vehicleTypes.map((type) => ({
                            value: type.id,
                            label: type.label,
                        }))}
                    />
                </div>

                <div className="mt-auto pt-2">
                    <Button 
                        variant="primary" 
                        fullWidth 
                        size="lg"
                        onClick={handleCalculate}
                        disabled={!origin}
                        icon={<Truck size={18} />}
                    >
                        Calculate Rate
                    </Button>
                    <span className="block text-center text-xs text-[var(--text-secondary)] mt-2">
                        {activeCompanyPriceList
                            ? `Using ${activeCompanyPriceList.name} from ${activeCompanyPriceList.sourceFileName}.`
                            : allCompanyEstimate?.companyCount
                                ? `Averaging ${allCompanyEstimate.companyCount} active company price list${allCompanyEstimate.companyCount === 1 ? '' : 's'} for ${origin} using ${allCompanyEstimate.matchLevel === 'lane' ? 'matched lanes' : 'state rates'}.`
                                : 'Rates update daily and include standard handling.'}
                        {!activeCompanyPriceList && config.updatedFromPdfName ? ` Last file: ${config.updatedFromPdfName}.` : ''}
                    </span>
                </div>

                <AnimatePresence>
                    {estimatedCost !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <div className="mt-4 p-4 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.12)] border border-[rgba(var(--accent-gold-rgb),0.6)] text-center">
                                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block">
                                    Estimated Shipping Cost
                                </span>
                                <div className="text-3xl font-extrabold text-[var(--text-primary)] my-2">
                                    {formatCurrency(estimatedCost)}
                                </div>
                                <span className="block text-xs text-[var(--text-secondary)] italic">
                                    *Rates are subject to change. Includes ocean freight & standard handling.
                                </span>
                                {calculationTrace && (
                                    <span className="block text-[11px] text-[var(--text-secondary)] mt-2">
                                        Source: {calculationTrace.companyName} / {calculationTrace.priceListName} ({calculationTrace.priceListId}) / {calculationTrace.sourceFileName}. Base {formatCurrency(calculationTrace.baseRate)} x {calculationTrace.multiplier}; {calculationTrace.rowSource} / {calculationTrace.rowConfidence}.
                                        {calculationTrace.averagedCompanyCount ? ` ${calculationTrace.averagedCompanyCount} companies, ${calculationTrace.matchedAuctionRows || 0} matched auction rows, ${calculationTrace.matchLevel || 'state'} match.` : ''}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}