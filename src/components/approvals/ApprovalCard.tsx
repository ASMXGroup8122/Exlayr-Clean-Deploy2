'use client';

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ApprovalCardProps {
  id: string;
  type: 'sponsor' | 'issuer' | 'exchange';
  name: string;
  status: string;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalCard({
  id,
  type,
  name,
  status,
  onApprove,
  onReject
}: ApprovalCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground">Type: {type}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Status: {status}</p>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onReject}>Reject</Button>
        <Button onClick={onApprove}>Approve</Button>
      </CardFooter>
    </Card>
  );
} 