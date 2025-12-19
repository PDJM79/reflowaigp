import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface MFAChangeEmailProps {
  userName: string;
  userEmail: string;
  action: 'enabled' | 'disabled';
  changedBy: string;
  isSelf: boolean;
  timestamp: string;
}

export const MFAChangeEmail = ({
  userName,
  userEmail,
  action,
  changedBy,
  isSelf,
  timestamp,
}: MFAChangeEmailProps) => {
  const actionText = action === 'enabled' ? 'enabled' : 'disabled';
  const actionColor = action === 'enabled' ? '#16a34a' : '#dc2626';
  const actionEmoji = action === 'enabled' ? '🔒' : '🔓';

  return (
    <Html>
      <Head />
      <Preview>
        Two-Factor Authentication has been {actionText} on your account
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {actionEmoji} Two-Factor Authentication {actionText.charAt(0).toUpperCase() + actionText.slice(1)}
          </Heading>
          
          <Text style={text}>
            Hello {userName || 'there'},
          </Text>

          <Section style={alertBox}>
            <Text style={{ ...alertText, color: actionColor }}>
              Two-Factor Authentication has been <strong>{actionText}</strong> on your ReflowAI GP account.
            </Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Account:</Text>
            <Text style={detailValue}>{userEmail}</Text>
            
            <Text style={detailLabel}>Changed by:</Text>
            <Text style={detailValue}>
              {isSelf ? 'You (self-service)' : changedBy}
            </Text>
            
            <Text style={detailLabel}>Time:</Text>
            <Text style={detailValue}>{timestamp}</Text>
          </Section>

          {!isSelf && (
            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ <strong>Important:</strong> This change was made by an administrator. 
                If you did not request this change, please contact your practice manager immediately.
              </Text>
            </Section>
          )}

          {action === 'disabled' && (
            <Section style={infoBox}>
              <Text style={infoText}>
                Your account is now less secure without Two-Factor Authentication. 
                We recommend re-enabling MFA to protect your account from unauthorized access.
              </Text>
            </Section>
          )}

          {action === 'enabled' && (
            <Section style={successBox}>
              <Text style={successText}>
                ✓ Your account is now protected with an additional layer of security. 
                You will need to enter a code from your authenticator app when signing in.
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            This is an automated security notification from ReflowAI GP. 
            If you have any questions or concerns, please contact your system administrator.
          </Text>
          
          <Text style={footerSmall}>
            © {new Date().getFullYear()} ReflowAI GP. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default MFAChangeEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 24px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const alertBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
};

const alertText = {
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  textAlign: 'center' as const,
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
};

const detailLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  margin: '12px 0 4px',
  letterSpacing: '0.05em',
};

const detailValue = {
  color: '#1f2937',
  fontSize: '14px',
  margin: '0 0 8px',
};

const warningBox = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  borderRadius: '4px',
  padding: '12px 16px',
  margin: '24px 0',
};

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#fee2e2',
  borderLeft: '4px solid #ef4444',
  borderRadius: '4px',
  padding: '12px 16px',
  margin: '24px 0',
};

const infoText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const successBox = {
  backgroundColor: '#dcfce7',
  borderLeft: '4px solid #22c55e',
  borderRadius: '4px',
  padding: '12px 16px',
  margin: '24px 0',
};

const successText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0 0 8px',
};

const footerSmall = {
  color: '#9ca3af',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: '0',
};
