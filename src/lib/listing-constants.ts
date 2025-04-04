export const INSTRUMENT_CATEGORIES = [
    'Equity',
    'Bond',
    'Fund',
    'Structured Product'
] as const;

export const SUB_CATEGORIES = {
    Equity: ['Ordinary Shares', 'Preference Shares', 'Depository Receipts'],
    Bond: ['Corporate Bond', 'Convertible Bond', 'Green Bond'],
    Fund: ['ETF', 'Mutual Fund', 'REIT'],
    'Structured Product': ['Note', 'Certificate', 'Warrant']
} as const;

export const EXCHANGES = [
    'MERJ Exchange',
    'LSE',
    'ASMX'
] as const;

export const MARKETPLACES = {
    'MERJ Exchange': ['Equity Market', 'Bond Market', 'Fund Market'],
    'LSE': ['Main Market', 'AIM'],
    'ASMX': ['Primary Market', 'Secondary Market']
} as const;

export type InstrumentCategory = typeof INSTRUMENT_CATEGORIES[number];
export type SubCategory = typeof SUB_CATEGORIES[InstrumentCategory][number];
export type Exchange = typeof EXCHANGES[number];
export type Marketplace = typeof MARKETPLACES[Exchange][number]; 