'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';

// Define state shape
interface DocumentAnalysisState {
  documentId: string;
  isAnalyzing: boolean;
  analysisResult: any | null;
  error: string | null;
  sectionStates: Record<string, {
    isAnalyzed: boolean;
    result?: any;
  }>;
  interactions: Record<string, any[]>;
  progress: number;
  analysisStage?: string;
  currentSection?: string;
}

// Define action types
type DocumentAnalysisAction = 
  | { type: 'START_ANALYSIS' }
  | { type: 'FINISH_ANALYSIS', payload: any }
  | { type: 'SET_ERROR', payload: string | null }
  | { type: 'SET_SECTION_RESULT', payload: { sectionId: string, result: any } }
  | { type: 'ADD_INTERACTION', payload: { sectionId: string, interaction: any } }
  | { type: 'SET_ANALYZING', payload: boolean }
  | { type: 'SET_PROGRESS', payload: { progress: number, stage?: string, currentSection?: string } }
  | { type: 'CLEAR_PENDING_OPERATIONS' };

// Initial state
const initialState: DocumentAnalysisState = {
  documentId: '',
  isAnalyzing: false,
  analysisResult: null,
  error: null,
  sectionStates: {},
  interactions: {},
  progress: 0
};

// Reducer function
function documentAnalysisReducer(state: DocumentAnalysisState, action: DocumentAnalysisAction): DocumentAnalysisState {
  console.log("[Reducer] Action Received:", action.type, action);
  switch (action.type) {
    case 'START_ANALYSIS':
      return {
        ...state,
        isAnalyzing: true,
        error: null,
        progress: 0
      };
    case 'FINISH_ANALYSIS':
      return {
        ...state,
        isAnalyzing: false,
        analysisResult: action.payload,
        progress: 100
      };
    case 'SET_ERROR':
      return {
        ...state,
        isAnalyzing: false,
        error: action.payload
      };
    case 'SET_SECTION_RESULT':
      console.log(`[Reducer] SET_SECTION_RESULT for ${action.payload.sectionId}. Current sectionStates:`, JSON.stringify(state.sectionStates));
      console.log(`[Reducer] SET_SECTION_RESULT payload:`, JSON.stringify(action.payload));
      
      // Check for subsection results and log them specifically
      const metadata = action.payload.result?.metadata;
      const subsectionResults = metadata?.subsectionResults;
      console.log(`[Reducer] SET_SECTION_RESULT metadata:`, metadata);
      console.log(`[Reducer] SET_SECTION_RESULT subsectionResults:`, subsectionResults);
      
      const newState = {
        ...state,
        sectionStates: {
          ...state.sectionStates,
          [action.payload.sectionId]: {
            isAnalyzed: true,
            result: action.payload.result
          }
        }
      };
      console.log(`[Reducer] SET_SECTION_RESULT for ${action.payload.sectionId}. New sectionStates:`, JSON.stringify(newState.sectionStates));
      return newState;
    case 'ADD_INTERACTION':
      const sectionId = action.payload.sectionId;
      return {
        ...state,
        interactions: {
          ...state.interactions,
          [sectionId]: [
            ...(state.interactions[sectionId] || []),
            action.payload.interaction
          ]
        }
      };
    case 'SET_ANALYZING':
      console.log(`[Reducer] SET_ANALYZING. Current state: ${state.isAnalyzing}, Payload: ${action.payload}`);
      const newStateAnalyzing = { ...state, isAnalyzing: action.payload };
      console.log(`[Reducer] SET_ANALYZING. New state: ${newStateAnalyzing.isAnalyzing}`);
      return newStateAnalyzing;
    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.payload.progress,
        analysisStage: action.payload.stage,
        currentSection: action.payload.currentSection
      };
    case 'CLEAR_PENDING_OPERATIONS':
      return {
        ...state,
        progress: 0,
        analysisStage: undefined,
        currentSection: undefined
      };
    default:
      console.log("[Reducer] Unknown action type or default case.");
      return state;
  }
}

// Create context with state and dispatch
interface DocumentAnalysisContextType {
  state: DocumentAnalysisState;
  dispatch: React.Dispatch<DocumentAnalysisAction>;
}

const DocumentAnalysisContext = createContext<DocumentAnalysisContextType | undefined>(undefined);

export function useDocumentAnalysis() {
  const context = useContext(DocumentAnalysisContext);
  if (context === undefined) {
    throw new Error('useDocumentAnalysis must be used within a DocumentAnalysisProvider');
  }
  return context;
}

interface DocumentAnalysisProviderProps {
  children: ReactNode;
  documentId: string;
}

export function DocumentAnalysisProvider({ children, documentId }: DocumentAnalysisProviderProps) {
  const [state, dispatch] = useReducer(documentAnalysisReducer, {
    ...initialState,
    documentId
  });

  return (
    <DocumentAnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </DocumentAnalysisContext.Provider>
  );
} 
