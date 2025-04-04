'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { InstrumentCategory, SubCategory, Exchange, Marketplace } from '@/lib/listing-constants';

interface ListingForm {
    issuer: {
        id: string;
        name: string;
    };
    instrument: {
        category: InstrumentCategory | '';
        subCategory: SubCategory | '';
        name: string;
        ticker: string;
    };
    exchange: {
        name: Exchange | '';
        marketplace: Marketplace | '';
    };
    dueDiligence: {
        director: {
            directors: {
                name: string;
                position: string;
                background: string;
                pep_status: boolean;
            }[];
        };
        industry: {
            market_size: string;
            competitors: string[];
            regulatory_environment: string;
            growth_factors: string[];
        };
        company: {
            compliance_status: string;
            risk_factors: string[];
            financial_overview: {
                revenue: number;
                profit: number;
                year: number;
            }[];
        };
    };
}

interface ListingContextType {
    formData: ListingForm;
    updateForm: (data: Partial<ListingForm>) => void;
    updateDueDiligence: (section: keyof ListingForm['dueDiligence'], data: any) => void;
    resetForm: () => void;
}

const initialFormState: ListingForm = {
    issuer: {
        id: '',
        name: ''
    },
    instrument: {
        category: '',
        subCategory: '',
        name: '',
        ticker: ''
    },
    exchange: {
        name: '',
        marketplace: ''
    },
    dueDiligence: {
        director: {
            directors: []
        },
        industry: {
            market_size: '',
            competitors: [],
            regulatory_environment: '',
            growth_factors: []
        },
        company: {
            compliance_status: '',
            risk_factors: [],
            financial_overview: []
        }
    }
};

const ListingContext = createContext<ListingContextType | undefined>(undefined);

export function ListingProvider({ children }: { children: React.ReactNode }) {
    const [formData, setFormData] = useState<ListingForm>(initialFormState);

    useEffect(() => {
        const savedData = localStorage.getItem('listing_draft');
        if (savedData) {
            try {
                setFormData(JSON.parse(savedData));
            } catch (error) {
                console.error('Error loading saved listing data:', error);
            }
        }
    }, []);

    const updateForm = (data: Partial<ListingForm>) => {
        setFormData(prev => {
            const newData = { ...prev, ...data };
            localStorage.setItem('listing_draft', JSON.stringify(newData));
            return newData;
        });
    };

    const updateDueDiligence = (section: keyof ListingForm['dueDiligence'], data: any) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                dueDiligence: {
                    ...prev.dueDiligence,
                    [section]: data
                }
            };
            localStorage.setItem('listing_draft', JSON.stringify(newData));
            return newData;
        });
    };

    const resetForm = () => {
        localStorage.removeItem('listing_draft');
        setFormData(initialFormState);
    };

    return (
        <ListingContext.Provider value={{ formData, updateForm, updateDueDiligence, resetForm }}>
            {children}
        </ListingContext.Provider>
    );
}

export function useListing() {
    const context = useContext(ListingContext);
    if (context === undefined) {
        throw new Error('useListing must be used within a ListingProvider');
    }
    return context;
} 