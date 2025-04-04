import { NextResponse } from 'next/server';

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
      lastName,
    } = body;

    // Determine which template to use based on status
    const templateId = status === 'approved'
      ? parseInt(process.env.BREVO_ACCESS_APPROVED_TEMPLATE_ID || '0', 10)
      : parseInt(process.env.BREVO_ACCESS_REJECTED_TEMPLATE_ID || '0', 10);

    // Make a direct API call to Brevo (Sendinblue)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY as string,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: 'dbw+ai@asmx.group' }], // or use userEmail, if you want
        templateId,
        params: {
          firstName,
          lastName,
          userEmail,
          organizationType,
          role,
          rejectionReason,
          loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/sign-in`,
        },
      }),
    });

    if (!response.ok) {
      // Brevo returned an error status
      console.error('Brevo API error:', response.status, await response.text());
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // Success
    return NextResponse.json({ success: true });
  } catch (error) {
    // General error handling
    console.error('Brevo error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
