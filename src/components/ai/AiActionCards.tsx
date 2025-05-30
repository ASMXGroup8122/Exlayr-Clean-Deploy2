'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    // General Navigation
    LayoutDashboard,
    List,
    Users, // If clients section exists
    BarChart3, // If analytics exists
    BookOpen,
    Settings,
    CreditCard, // For Billing
    // Listing Process
    PlusCircle, // Start new listing
    FileEdit, // View draft listings
    ClipboardList, // Listing requirements
    FilePenLine, // Edit listing doc
    RotateCcw, // Revisions needed
    Send, // Submit listing / Approve Section
    // Compliance / Tools
    ShieldCheck, // Due Diligence
    FlaskConical, // AI Compliance / Review AI Draft
    ScrollText, // Compliance Guidelines
    // Doc Generation
    ListChecks, // Choose Listing for Gen
    Library, // Select Section for Gen
    ScanSearch, // Review AI Draft
    CheckCircle, // Approve Section
    // Campaign Manager icons
    Megaphone, // Or Target, Volume2
    Eye, // View Campaigns
    LineChart, // Campaign Analytics
    // Analytics icons
    AreaChart, // General Analytics
    TrendingUp, // Market Trends
    DollarSign, // Trading Volume
    Activity, // Real-time stats
    // Settings Icons
    UserCog, // Edit Profile
    KeyRound, // Change Password
    Bell, // Notification Settings
    Building, // View issuers / Organization Settings
    // Billing Icons
    Receipt, // View Invoices
    History, // Transaction History
    ArrowUpCircle, // Upgrade Plan
    LogOut, // Temp for Cancel Plan (consider better icon)
    // Common
    ArrowRight,
    UserPlus, // Add issuer icon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// === Interfaces ===
interface CardInfo {
  icon: React.ElementType;
  title: string;
  description: string;
  intentAction: string; // Format: 'navigate:/path/{{orgId}}' or 'action:some_action'
}

interface AiActionCardsProps {
  intent: string | null;
  orgId: string | null; // Pass orgId for dynamic routing
}

// === Card Definitions ===
// Define cards for various intents. Ensure paths are correct.
const cardIntents: Record<string, CardInfo[]> = {
  general_navigation: [
    { icon: LayoutDashboard, title: 'Go to Dashboard', description: 'View your main dashboard overview.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}' },
    { icon: List, title: 'Manage Listings', description: 'View, edit, or track your listing applications.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/listings' },
    // { icon: Users, title: 'Manage Clients', description: 'View and manage your client relationships.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/clients' }, // Uncomment if exists
    // { icon: BarChart3, title: 'View Analytics', description: 'Check performance metrics and data insights.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/analytics' }, // Uncomment if exists
    { icon: BookOpen, title: 'Knowledge Vault', description: 'Find guidelines, regulations, and help documents.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/knowledge-vault' }, // Verify path
  ],
  list_company: [
    { icon: PlusCircle, title: 'Start New Listing', description: 'Begin the process for a new issuer.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/new-listing' }, // Verify path
    { icon: FileEdit, title: 'View Draft Listings', description: 'Continue working on incomplete applications.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/listings?status=draft' },
    { icon: ClipboardList, title: 'Listing Requirements', description: 'Understand the steps and documents needed.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/knowledge-vault/listing-requirements' }, // Verify path
  ],
  manage_listing: [
    { icon: List, title: 'View All Listings', description: 'See the status and details of all your listings.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/listings' },
    { icon: FilePenLine, title: 'Edit Listing Document', description: 'Select a listing to modify its document.', intentAction: 'action:select_listing_for_edit' },
    { icon: RotateCcw, title: 'Check Revisions Needed', description: 'Find listings sent back for changes.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/listings?status=needs_revision' },
    { icon: Send, title: 'Submit Listing for Review', description: 'Send a completed draft to the Exchange.', intentAction: 'action:select_listing_for_submission' },
  ],
  manage_issuer: [
    { icon: Building, title: 'View Issuers', description: 'See all registered issuer entities.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/issuers' },
    { icon: UserPlus, title: 'Add New Issuer', description: 'Register a new issuer entity.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/issuers/new' },
    { icon: FilePenLine, title: 'Edit Issuer Details', description: 'Update information for an existing issuer.', intentAction: 'action:select_issuer_for_edit' },
  ],
  compliance_check: [
    { icon: ShieldCheck, title: 'Personnel Due Diligence', description: 'Initiate background checks.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/tools/due-diligence' }, // Verify path
    { icon: FlaskConical, title: 'Document AI Compliance', description: 'Pre-screen a document for potential issues.', intentAction: 'action:select_document_for_ai_check' },
    { icon: ScrollText, title: 'Compliance Guidelines', description: 'Access rules and best practices.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/knowledge-vault/compliance' }, // Verify path
  ],
  generate_document: [
    { icon: ListChecks, title: 'Choose Listing', description: 'Select the listing to generate content for.', intentAction: 'action:select_listing_for_generation' },
    { icon: Library, title: 'Select Section', description: 'Pick the document section for AI drafting.', intentAction: 'action:select_section_for_generation' },
    { icon: ScanSearch, title: 'Review AI Draft', description: 'Check, edit, and refine AI-generated content.', intentAction: 'action:review_ai_draft' },
    { icon: CheckCircle, title: 'Approve Section', description: 'Finalize and save the AI-drafted section.', intentAction: 'action:approve_generated_section' },
  ],
  campaign_management: [
    { icon: Megaphone, title: 'Create New Campaign', description: 'Set up a new marketing or funding campaign.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/tools/campaign-manager/new' }, // Example path
    { icon: Eye, title: 'View Active Campaigns', description: 'Monitor your ongoing campaigns.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/tools/campaign-manager' }, // Example path
    { icon: LineChart, title: 'Campaign Analytics', description: 'Analyze the performance of your campaigns.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/tools/campaign-manager/analytics' }, // Example path
  ],
  view_analytics: [
    { icon: AreaChart, title: 'View Analytics Dashboard', description: 'See key metrics and performance charts.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/analytics' }, // Verify path
    { icon: TrendingUp, title: 'Check Market Trends', description: 'View current market activity and insights.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/analytics/market' }, // Example path
    { icon: DollarSign, title: 'Trading Volume Stats', description: 'Analyze trading volume for your listings.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/analytics/volume' }, // Example path
    { icon: Activity, title: 'Real-time Activity', description: 'Monitor live market or platform events.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/analytics/live' }, // Example path
  ],
  billing_management: [
    { icon: Receipt, title: 'View Invoices', description: 'See your past and current invoices.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/billing/invoices' },
    { icon: History, title: 'Payment History', description: 'Review your transaction records.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/billing/history' },
    { icon: ArrowUpCircle, title: 'Upgrade Plan', description: 'Explore different subscription options.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/billing/upgrade' },
    { icon: LogOut, title: 'Manage Subscription', description: 'Update payment methods or cancel plan.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/billing/subscription' },
  ],
  settings_management: [
    { icon: UserCog, title: 'Edit Profile', description: 'Update your personal information.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/settings/profile' },
    { icon: KeyRound, title: 'Change Password', description: 'Update your account password.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/settings/password' },
    { icon: Bell, title: 'Notifications', description: 'Manage your email and app alerts.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/settings/notifications' },
    { icon: Building, title: 'Organization', description: 'View or manage your organization details.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/settings/organization' },
    { icon: Settings, title: 'General Settings', description: 'Access all account settings.', intentAction: 'navigate:/dashboard/sponsor/{{orgId}}/settings' },
  ],
  // Add more intents like 'help', 'support', 'manage_users' etc. later
};

// === Animation Variants ===
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0 }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

// === Component ===
const AiActionCards: React.FC<AiActionCardsProps> = ({ intent, orgId }) => {
  console.log(`[AiActionCards] Received intent prop: ${intent}`);

  const cards = intent ? cardIntents[intent] : null;
  console.log(`[AiActionCards] Will render cards? ${!!cards}`);

  const handleCardClick = (action: string) => {
    let finalAction = action;
    // Replace placeholder for orgId if present and orgId is available
    if (finalAction.includes('{{orgId}}') && orgId) {
        finalAction = finalAction.replace('{{orgId}}', orgId);
    } else if (finalAction.includes('{{orgId}}') && !orgId) {
        console.warn('Cannot perform action, orgId is missing for template:', action);
        return; // Prevent action if orgId is needed but missing
    }

    console.log(`AiActionCard Clicked: ${finalAction}`);

    // Placeholder logic for handling the action string
    if (finalAction.startsWith('navigate:')) {
      const path = finalAction.split(':')[1];
      console.log(`-> NAVIGATE to: ${path}`);
      // Actual navigation would be done here using Next.js router
      // Example (would require importing useRouter from next/navigation):
      // const router = useRouter(); router.push(path);
    } else if (finalAction.startsWith('action:')) {
      const actionName = finalAction.split(':')[1];
      console.log(`-> DISPATCH action: ${actionName}`);
      // Here you would typically trigger a function, open a modal, or update state
    } else {
        console.warn('Unknown action card format:', finalAction);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {cards && intent && (
        <motion.div
          key={intent}
          className="mb-6 flex flex-col gap-3 px-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {cards.map((card, index) => (
            <motion.div
              key={`${intent}-${index}`}
              className="group bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer w-full"
              variants={cardVariants}
              onClick={() => handleCardClick(card.intentAction)}
            >
              <div className="p-3 flex items-start gap-3">
                <div className="flex-shrink-0 p-2 rounded-md bg-blue-50">
                  <card.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 mb-1 truncate">
                    {card.title}
                  </h4>
                  <p className="text-xs text-gray-600 line-clamp-2 overflow-hidden">
                    {card.description}
                  </p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AiActionCards; 
