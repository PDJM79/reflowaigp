import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ApprovalRequestedEmailProps {
  managerName: string;
  entityType: string;
  entityName: string;
  requestedByName: string;
  urgency: 'high' | 'medium' | 'low';
  practiceName: string;
  dashboardUrl: string;
  pendingCount?: number;
}

const urgencyColors = {
  high: '#dc2626',
  medium: '#f59e0b',
  low: '#22c55e',
};

const urgencyLabels = {
  high: '🔴 High Priority',
  medium: '🟡 Medium Priority',
  low: '🟢 Low Priority',
};

export const ApprovalRequestedEmail = ({
  managerName = 'Practice Manager',
  entityType = 'policy',
  entityName = 'Health & Safety Policy',
  requestedByName = 'Staff Member',
  urgency = 'medium',
  practiceName = 'Your Practice',
  dashboardUrl = 'https://app.example.com/dashboards/governance',
  pendingCount = 1,
}: ApprovalRequestedEmailProps) => (
  <Html>
    <Head />
    <Preview>Approval Required: {entityName} needs your sign-off</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Governance Approval Required</Heading>
        
        <Text style={text}>
          Dear {managerName},
        </Text>
        
        <Text style={text}>
          A new item requires your formal approval at <strong>{practiceName}</strong>.
        </Text>
        
        <Section style={detailsBox}>
          <Text style={detailLabel}>Document Type</Text>
          <Text style={detailValue}>{formatEntityType(entityType)}</Text>
          
          <Text style={detailLabel}>Document Name</Text>
          <Text style={detailValue}>{entityName}</Text>
          
          <Text style={detailLabel}>Submitted By</Text>
          <Text style={detailValue}>{requestedByName}</Text>
          
          <Text style={detailLabel}>Priority</Text>
          <Text style={{ ...detailValue, color: urgencyColors[urgency] }}>
            {urgencyLabels[urgency]}
          </Text>
        </Section>
        
        {pendingCount > 1 && (
          <Text style={pendingText}>
            You have <strong>{pendingCount} items</strong> pending approval.
          </Text>
        )}
        
        <Section style={buttonContainer}>
          <Button style={button} href={dashboardUrl}>
            Review & Approve
          </Button>
        </Section>
        
        <Hr style={hr} />
        
        <Text style={footerText}>
          This approval is required for regulatory compliance and audit traceability. 
          Your digital signature will be recorded for the governance audit trail.
        </Text>
        
        <Text style={footer}>
          GP Compliance System • {practiceName}
        </Text>
      </Container>
    </Body>
  </Html>
);

function formatEntityType(type: string): string {
  const typeMap: Record<string, string> = {
    policy: 'Policy Document',
    fire_safety_assessment: 'Fire Safety Assessment',
    ipc_audit: 'IPC Audit',
    room_assessment: 'Room Assessment',
    claim_run: 'Claims Submission',
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default ApprovalRequestedEmail;

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
  color: '#1a1a2e',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 24px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
};

const detailLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
  letterSpacing: '0.5px',
};

const detailValue = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 16px',
};

const pendingText = {
  color: '#7c3aed',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0',
  padding: '12px',
  backgroundColor: '#f5f3ff',
  borderRadius: '6px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
  display: 'inline-block',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '16px 0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '24px 0 0',
};
