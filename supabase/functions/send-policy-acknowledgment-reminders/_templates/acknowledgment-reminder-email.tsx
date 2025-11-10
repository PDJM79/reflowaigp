import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface UnacknowledgedPolicy {
  policy_id: string;
  policy_title: string;
  policy_version: string;
  effective_from: string;
  days_overdue: number;
}

interface AcknowledgmentReminderEmailProps {
  staffName: string;
  practiceName: string;
  unacknowledgedCount: number;
  policies: UnacknowledgedPolicy[];
  dashboardUrl: string;
}

export const AcknowledgmentReminderEmail = ({
  staffName = 'Staff Member',
  practiceName = 'Practice',
  unacknowledgedCount = 1,
  policies = [],
  dashboardUrl = '#',
}: AcknowledgmentReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>You have {unacknowledgedCount} policy acknowledgment{unacknowledgedCount > 1 ? 's' : ''} pending</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Policy Acknowledgment Reminder</Heading>
        
        <Text style={text}>
          Hi {staffName},
        </Text>
        
        <Text style={text}>
          This is a friendly reminder that you have <strong>{unacknowledgedCount}</strong> policy document{unacknowledgedCount > 1 ? 's' : ''} 
          that require{unacknowledgedCount === 1 ? 's' : ''} your acknowledgment at <strong>{practiceName}</strong>.
        </Text>

        <Text style={text}>
          Please review and acknowledge the following {unacknowledgedCount === 1 ? 'policy' : 'policies'} as soon as possible:
        </Text>

        <Section style={policyListContainer}>
          {policies.map((policy, index) => (
            <Section key={policy.policy_id} style={policyItem}>
              <Text style={policyTitle}>
                {index + 1}. {policy.policy_title}
              </Text>
              <Text style={policyDetails}>
                Version: {policy.policy_version} | 
                Effective: {new Date(policy.effective_from).toLocaleDateString()} | 
                <span style={overdueText}>
                  {policy.days_overdue > 0 
                    ? `${policy.days_overdue} day${policy.days_overdue > 1 ? 's' : ''} overdue` 
                    : 'Due now'}
                </span>
              </Text>
            </Section>
          ))}
        </Section>

        <Section style={buttonContainer}>
          <Link href={dashboardUrl} style={button}>
            Review & Acknowledge Policies
          </Link>
        </Section>

        <Hr style={hr} />

        <Text style={footerText}>
          <strong>Why is this important?</strong>
        </Text>
        <Text style={footerText}>
          Policy acknowledgment ensures that all staff members are aware of and understand important 
          practice policies and procedures. Your acknowledgment confirms that you have read and will 
          comply with these policies.
        </Text>

        <Text style={footerText}>
          If you have any questions about these policies, please contact your practice manager or IG lead.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          This is an automated reminder from the Policy Management System at {practiceName}.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default AcknowledgmentReminderEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 20px 20px',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 20px',
};

const policyListContainer = {
  margin: '24px 20px',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e1e4e8',
};

const policyItem = {
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid #e1e4e8',
};

const policyTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const policyDetails = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const overdueText = {
  color: '#d73a49',
  fontWeight: '600',
  marginLeft: '8px',
};

const buttonContainer = {
  margin: '32px 20px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e1e4e8',
  margin: '32px 20px',
};

const footerText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 20px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '24px 20px 0',
};
