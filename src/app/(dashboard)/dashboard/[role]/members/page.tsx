import { MemberRequests } from '@/components/organization/MemberRequests';

export default function MembersPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Organization Members</h1>
            <MemberRequests />
            {/* Add active members list here */}
        </div>
    );
} 