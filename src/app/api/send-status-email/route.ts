import { NextResponse } from 'next/server';
import SibApiV3Sdk from 'sib-api-v3-sdk';

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            userEmail, 
            status, 
            organizationType, 
            role, 
            rejectionReason,
            firstName,
            lastName
        } = body;

        const templateId = status === 'approved' 
            ? parseInt(process.env.BREVO_ACCESS_APPROVED_TEMPLATE_ID!)
            : parseInt(process.env.BREVO_ACCESS_REJECTED_TEMPLATE_ID!);

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.to = [{ email: 'dbw+ai@asmx.group' }]; // Mock email for testing
        sendSmtpEmail.templateId = templateId;
        sendSmtpEmail.params = {
            firstName,
            lastName,
            userEmail,
            organizationType,
            role,
            rejectionReason,
            loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/sign-in`
        };

        await apiInstance.sendTransacEmail(sendSmtpEmail);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Brevo error:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
} 