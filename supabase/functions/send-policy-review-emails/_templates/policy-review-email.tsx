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

interface PolicyReviewEmailProps {
  managerName: string;
  practiceName: string;
  overdueCount: number;
  policies: Array<{
    id: string;
    title: string;
    version: string;
    review_due: string;
    owner_role: string;
  }>;
  dashboardUrl: string;
}

export const PolicyReviewEmail = ({
  managerName,
  practiceName,
  overdueCount,
  policies,
  dashboardUrl,
}: PolicyReviewEmailProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysOverdue = (reviewDue: string) => {
    const dueDate = new Date(reviewDue);
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Html>
      <Head />
      <Preview>
        {overdueCount} policy review{overdueCount > 1 ? 's' : ''} overdue - Action required
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⚠️ Policy Reviews Overdue</Heading>

          <Text style={text}>Hi {managerName},</Text>

          <Text style={text}>
            This is your weekly reminder that <strong>{overdueCount}</strong> policy review
            {overdueCount > 1 ? 's are' : ' is'} overdue for <strong>{practiceName}</strong>.
          </Text>

          <Text style={text}>
            Regular policy reviews are essential for maintaining compliance and ensuring your
            practice operates with up-to-date procedures.
          </Text>

          <Section style={policySection}>
            <Heading style={h2}>Policies Requiring Review:</Heading>

            {policies.map((policy, index) => {
              const daysOverdue = getDaysOverdue(policy.review_due);
              return (
                <div key={policy.id}>
                  <Section style={policyCard}>
                    <Text style={policyTitle}>
                      {index + 1}. {policy.title}
                    </Text>
                    <Text style={policyMeta}>
                      <strong>Version:</strong> {policy.version} |{' '}
                      <strong>Owner:</strong> {policy.owner_role}
                    </Text>
                    <Text style={overdueBadge}>
                      📅 Due: {formatDate(policy.review_due)} ({daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue)
                    </Text>
                  </Section>
                  {index < policies.length - 1 && <Hr style={divider} />}
                </div>
              );
            })}
          </Section>

          <Section style={buttonSection}>
            <Link href={dashboardUrl} style={button}>
              Review Policies Now
            </Link>
          </Section>

          <Hr style={divider} />

          <Text style={footerText}>
            <strong>What you need to do:</strong>
          </Text>
          <Text style={listItem}>• Review each policy to ensure it's still current and accurate</Text>
          <Text style={listItem}>• Update any outdated information or procedures</Text>
          <Text style={listItem}>• Set a new review date for the next periodic check</Text>
          <Text style={listItem}>• Ensure all staff acknowledge any updated policies</Text>

          <Hr style={divider} />

          <Text style={footer}>
            This is an automated weekly reminder. You can manage your notification preferences in
            your account settings.
          </Text>

          <Text style={footer}>
            {practiceName} | Policy Management System
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PolicyReviewEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#d97706',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
  lineHeight: '1.3',
};

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '20px 0 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const policySection = {
  padding: '0 40px',
  marginTop: '24px',
};

const policyCard = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
};

const policyTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  lineHeight: '1.4',
};

const policyMeta = {
  color: '#78350f',
  fontSize: '14px',
  margin: '4px 0',
  lineHeight: '1.4',
};

const overdueBadge = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '600',
  margin: '8px 0 0 0',
  lineHeight: '1.4',
};

const buttonSection = {
  padding: '0 40px',
  marginTop: '32px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '32px 40px',
};

const footerText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0 8px',
  padding: '0 40px',
};

const listItem = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '4px 0',
  padding: '0 40px 0 56px',
};

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0',
  padding: '0 40px',
};
