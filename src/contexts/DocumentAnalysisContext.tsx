import { createContext, useContext, useReducer, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AnalysisState {
  reviewCycleId: string | null;
  interactions: Record<string, any[]>;
  isAnalyzing: boolean;
  pendingOperations: Record<string, boolean>;
  hasUnfinishedOperations: boolean;
  currentReviewCycle: string | null;
  reviewCycleStatus: string | null;
  progress: number;
  currentSection: string | null;
  analysisStage: string;
  error: string | null;
  lastInteractionTimestamp: number;
}

type AnalysisAction =
  | { type: 'SET_REVIEW_CYCLE', payload: string | null }
  | { type: 'ADD_INTERACTION', payload: { sectionId: string, interaction: any } }
  | { type: 'SET_ANALYZING', payload: boolean }
  | { type: 'SET_PENDING_OPERATION', payload: { key: string, value: boolean } }
  | { type: 'SET_HAS_UNFINISHED_OPERATIONS', payload: boolean }
  | { type: 'CLEAR_PENDING_OPERATIONS' }
  | { type: 'SET_REVIEW_CYCLE_STATUS', payload: string | null }
  | { type: 'SET_PROGRESS', payload: { progress: number, section: string | null, stage: string } }
  | { type: 'SET_ERROR', payload: string | null }
  | { type: 'RESET_STATE' };

const initialState: AnalysisState = {
  reviewCycleId: null,
  interactions: {},
  isAnalyzing: false,
  pendingOperations: {},
  hasUnfinishedOperations: false,
  currentReviewCycle: null,
  reviewCycleStatus: null,
  progress: 0,
  currentSection: null,
  analysisStage: '',
  error: null,
  lastInteractionTimestamp: 0
};

function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'SET_REVIEW_CYCLE':
      return { ...state, reviewCycleId: action.payload };
    case 'ADD_INTERACTION':
      const sectionInteractions = state.interactions[action.payload.sectionId] || [];
      return {
        ...state,
        interactions: {
          ...state.interactions,
          [action.payload.sectionId]: [action.payload.interaction, ...sectionInteractions]
        },
        lastInteractionTimestamp: Date.now()
      };
    case 'SET_ANALYZING':
      return { 
        ...state, 
        isAnalyzing: action.payload,
        error: action.payload ? null : state.error // Clear error when starting analysis
      };
    case 'SET_PENDING_OPERATION':
      return {
        ...state,
        pendingOperations: {
          ...state.pendingOperations,
          [action.payload.key]: action.payload.value
        }
      };
    case 'SET_HAS_UNFINISHED_OPERATIONS':
      return { ...state, hasUnfinishedOperations: action.payload };
    case 'CLEAR_PENDING_OPERATIONS':
      return {
        ...state,
        pendingOperations: {},
        hasUnfinishedOperations: false
      };
    case 'SET_REVIEW_CYCLE_STATUS':
      return {
        ...state,
        reviewCycleStatus: action.payload,
        isAnalyzing: action.payload === 'in_progress'
      };
    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.payload.progress,
        currentSection: action.payload.section || state.currentSection,
        analysisStage: action.payload.stage || state.analysisStage
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isAnalyzing: false // Stop analyzing on error
      };
    case 'RESET_STATE':
      return {
        ...initialState,
        lastInteractionTimestamp: Date.now()
      };
    default:
      return state;
  }
}

const DocumentAnalysisContext = createContext<{
  state: AnalysisState;
  dispatch: React.Dispatch<AnalysisAction>;
} | null>(null);

export function DocumentAnalysisProvider({ children, documentId }: { children: ReactNode; documentId: string }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);
  const supabase = createClientComponentClient();
  const channelRef = useRef<any>(null);
  const reviewCycleChannelRef = useRef<any>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (reviewCycleChannelRef.current) {
      await reviewCycleChannelRef.current.unsubscribe();
      reviewCycleChannelRef.current = null;
    }
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // Handle unmount cleanup
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Subscribe to document-level changes
  useEffect(() => {
    if (!documentId) return;

    // console.log('Setting up document-level subscription for:', documentId);

    const setupSubscriptions = async () => {
      try {
        // Cleanup existing subscriptions
        await cleanup();

        // Setup document interactions subscription
        channelRef.current = supabase
          .channel(`document_interactions:${documentId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'document_interactions',
              filter: `document_id=eq.${documentId}`
            },
            (payload) => {
              // console.log('Received interaction update:', payload);
              
              // Ensure we're in a stable state before processing updates
              Promise.resolve().then(() => {
                if (payload.eventType === 'INSERT') {
                  // console.log('New interaction:', payload.new);
                  
                  dispatch({
                    type: 'ADD_INTERACTION',
                    payload: {
                      sectionId: payload.new.section_id,
                      interaction: payload.new
                    }
                  });

                  // Force immediate UI update
                  window.requestAnimationFrame(() => {
                    const progress = calculateProgress(payload.new.section_id);
                    dispatch({
                      type: 'SET_PROGRESS',
                      payload: {
                        progress,
                        section: payload.new.section_id,
                        stage: `Processing section ${payload.new.section_id}`
                      }
                    });
                  });
                }
              });
            }
          )
          .subscribe((status) => {
            // console.log('Interaction subscription status:', status);
            if (status === 'SUBSCRIBED') {
              // Don't set analyzing here - let the button component control this
              // console.log('Successfully subscribed to interactions');
            } else if (status === 'CHANNEL_ERROR') {
              dispatch({ 
                type: 'SET_ERROR', 
                payload: 'Failed to connect to analysis updates' 
              });
            }
          });

        // Setup review cycle subscription
        reviewCycleChannelRef.current = supabase
          .channel(`document_review_cycles:${documentId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'document_review_cycles',
              filter: `document_id=eq.${documentId}`
            },
            (payload) => {
              // console.log('Review cycle update:', payload);
              
              // Ensure we're in a stable state before processing updates
              Promise.resolve().then(() => {
                if (payload.eventType === 'UPDATE') {
                  const status = payload.new.status;
                  dispatch({ type: 'SET_REVIEW_CYCLE_STATUS', payload: status });
                  
                  // Handle completion or cancellation
                  if (['completed', 'cancelled', 'failed'].includes(status)) {
                    dispatch({ type: 'CLEAR_PENDING_OPERATIONS' });
                    dispatch({ type: 'SET_ANALYZING', payload: false });
                    
                    // Dispatch custom event for completion
                    const event = new CustomEvent('document-analysis-complete', {
                      detail: { results: state.interactions }
                    });
                    window.dispatchEvent(event);
                  }
                }
              });
            }
          )
          .subscribe((status) => {
            // console.log('Review cycle subscription status:', status);
            if (status === 'CHANNEL_ERROR') {
              dispatch({ 
                type: 'SET_ERROR', 
                payload: 'Failed to connect to review cycle updates' 
              });
            }
          });

      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: 'Failed to setup analysis monitoring' 
        });
      }
    };

    setupSubscriptions();
  }, [documentId, cleanup]); // Remove state.isAnalyzing dependency

  // Calculate progress based on completed sections
  const calculateProgress = (currentSectionId: string) => {
    const totalSections = Object.keys(state.interactions).length;
    if (totalSections === 0) return 0;
    
    const completedSections = Object.values(state.interactions)
      .filter(interactions => interactions.length > 0).length;
    
    return Math.round((completedSections / totalSections) * 100);
  };

  // Force immediate UI updates when pending operations change
  useEffect(() => {
    if (!Object.keys(state.pendingOperations).length) return;
    
    window.requestAnimationFrame(() => {
      const hasUnfinished = Object.values(state.pendingOperations).some(status => !status);
      dispatch({ type: 'SET_HAS_UNFINISHED_OPERATIONS', payload: hasUnfinished });
    });
  }, [state.pendingOperations]);

  // Memoize the context value
  const contextValue = useMemo(() => ({ state, dispatch }), [state]); // dispatch is stable

  return (
    <DocumentAnalysisContext.Provider value={contextValue}>
      {children}
    </DocumentAnalysisContext.Provider>
  );
}

export function useDocumentAnalysis() {
  const context = useContext(DocumentAnalysisContext);
  if (!context) {
    throw new Error('useDocumentAnalysis must be used within a DocumentAnalysisProvider');
  }
  return context;
} 