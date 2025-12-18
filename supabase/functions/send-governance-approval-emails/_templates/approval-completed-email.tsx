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

interface ApprovalCompletedEmailProps {
  ownerName: string;
  entityType: string;
  entityName: string;
  decision: 'approved' | 'rejected' | 'pending_changes';
  approverName: string;
  approverTitle?: string;
  notes?: string;
  approvedAt: string;
  practiceName: string;
  viewUrl: string;
}

const decisionConfig = {
  approved: {
    icon: '✅',
    label: 'Approved',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  rejected: {
    icon: '❌',
    label: 'Rejected',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  pending_changes: {
    icon: '⚠️',
    label: 'Changes Requested',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fed7aa',
  },
};

export const ApprovalCompletedEmail = ({
  ownerName = 'Team Member',
  entityType = 'policy',
  entityName = 'Health & Safety Policy',
  decision = 'approved',
  approverName = 'Practice Manager',
  approverTitle = 'Practice Manager',
  notes,
  approvedAt = new Date().toISOString(),
  practiceName = 'Your Practice',
  viewUrl = 'https://app.example.com/policies/123',
}: ApprovalCompletedEmailProps) => {
  const config = decisionConfig[decision];
  
  return (
    <Html>
      <Head />
      <Preview>
        {config.icon} Your {formatEntityType(entityType)} has been {config.label.toLowerCase()}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Approval Decision</Heading>
          
          <Text style={text}>
            Dear {ownerName},
          </Text>
          
          <Text style={text}>
            Your submitted document has received a governance decision.
          </Text>
          
          <Section style={{
            ...statusBox,
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          }}>
            <Text style={{ ...statusIcon }}>{config.icon}</Text>
            <Text style={{ ...statusLabel, color: config.color }}>
              {config.label}
            </Text>
          </Section>
          
          <Section style={detailsBox}>
            <Text style={detailLabel}>Document Type</Text>
            <Text style={detailValue}>{formatEntityType(entityType)}</Text>
            
            <Text style={detailLabel}>Document Name</Text>
            <Text style={detailValue}>{entityName}</Text>
            
            <Text style={detailLabel}>Decision By</Text>
            <Text style={detailValue}>
              {approverName}{approverTitle ? `, ${approverTitle}` : ''}
            </Text>
            
            <Text style={detailLabel}>Decision Date</Text>
            <Text style={detailValue}>
              {new Date(approvedAt).toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Section>
          
          {notes && (
            <Section style={notesBox}>
              <Text style={notesLabel}>Reviewer Notes</Text>
              <Text style={notesText}>{notes}</Text>
            </Section>
          )}
          
          {decision === 'pending_changes' && (
            <Text style={actionRequired}>
              Please review the requested changes and resubmit for approval.
            </Text>
          )}
          
          <Section style={buttonContainer}>
            <Button style={button} href={viewUrl}>
              View Document
            </Button>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footerText}>
            This decision has been recorded in the governance audit trail for regulatory compliance.
          </Text>
          
          <Text style={footer}>
            GP Compliance System • {practiceName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

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

export default ApprovalCompletedEmail;

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

const statusBox = {
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
  border: '2px solid',
};

const statusIcon = {
  fontSize: '48px',
  margin: '0 0 8px',
};

const statusLabel = {
  fontSize: '20px',
  fontWeight: '700',
  margin: '0',
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

const notesBox = {
  backgroundColor: '#fefce8',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #fef08a',
};

const notesLabel = {
  color: '#854d0e',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
};

const notesText = {
  color: '#713f12',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const actionRequired = {
  color: '#b45309',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0',
  padding: '12px',
  backgroundColor: '#fffbeb',
  borderRadius: '6px',
  fontWeight: '500',
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
