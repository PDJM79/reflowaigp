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

interface UnacknowledgedStaff {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  unacknowledged_policies: Array<{
    policy_title: string;
    policy_version: string;
    effective_from: string;
    days_overdue: number;
  }>;
}

interface PolicyEscalationEmailProps {
  managerName: string;
  practiceName: string;
  staffCount: number;
  policyCount: number;
  staffMembers: UnacknowledgedStaff[];
  dashboardUrl: string;
}

export const PolicyEscalationEmail = ({
  managerName = 'Manager',
  practiceName = 'Practice',
  staffCount = 1,
  policyCount = 1,
  staffMembers = [],
  dashboardUrl = '#',
}: PolicyEscalationEmailProps) => (
  <Html>
    <Head />
    <Preview>ESCALATION: {staffCount} staff member{staffCount > 1 ? 's' : ''} have not acknowledged required policies</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={alertBanner}>
          <Text style={alertText}>🚨 ESCALATION REQUIRED</Text>
        </Section>

        <Heading style={h1}>Policy Acknowledgment Escalation</Heading>
        
        <Text style={text}>
          Dear {managerName},
        </Text>
        
        <Text style={urgentText}>
          This is an escalation notice regarding unacknowledged policy documents at <strong>{practiceName}</strong>.
        </Text>

        <Section style={summaryBox}>
          <Text style={summaryText}>
            <strong>{staffCount}</strong> staff member{staffCount > 1 ? 's' : ''} under your supervision {staffCount === 1 ? 'has' : 'have'} not acknowledged <strong>{policyCount}</strong> policy document{policyCount > 1 ? 's' : ''} despite reminders being sent over 21 days ago.
          </Text>
        </Section>

        <Text style={text}>
          <strong>Immediate action is required:</strong>
        </Text>

        <Section style={staffListContainer}>
          {staffMembers.map((staff, staffIndex) => (
            <Section key={staff.staff_id} style={staffItem}>
              <Text style={staffName}>
                {staffIndex + 1}. {staff.staff_name}
              </Text>
              <Text style={staffEmail}>
                {staff.staff_email}
              </Text>
              <Text style={policyCountText}>
                {staff.unacknowledged_policies.length} unacknowledged {staff.unacknowledged_policies.length === 1 ? 'policy' : 'policies'}:
              </Text>
              {staff.unacknowledged_policies.map((policy, policyIndex) => (
                <Section key={`${staff.staff_id}-${policyIndex}`} style={policyDetail}>
                  <Text style={policyTitle}>
                    • {policy.policy_title} (v{policy.policy_version})
                  </Text>
                  <Text style={policyOverdue}>
                    Effective: {new Date(policy.effective_from).toLocaleDateString()} • 
                    <span style={overdueHighlight}> {policy.days_overdue} days overdue</span>
                  </Text>
                </Section>
              ))}
            </Section>
          ))}
        </Section>

        <Text style={text}>
          <strong>Required Actions:</strong>
        </Text>
        <Text style={actionList}>
          1. Contact each staff member immediately to ensure they acknowledge the outstanding policies<br />
          2. Investigate why acknowledgments have not been completed<br />
          3. Ensure staff understand the importance of policy compliance<br />
          4. Report any technical issues preventing acknowledgment to IT support
        </Text>

        <Section style={buttonContainer}>
          <Link href={dashboardUrl} style={button}>
            View Policy Dashboard
          </Link>
        </Section>

        <Hr style={hr} />

        <Section style={warningBox}>
          <Text style={warningTitle}>⚠️ Compliance Warning</Text>
          <Text style={warningText}>
            Failure to acknowledge policies is a compliance issue that may affect:
          </Text>
          <Text style={warningList}>
            • Practice audit readiness<br />
            • Staff competency records<br />
            • Regulatory compliance<br />
            • Insurance and liability coverage
          </Text>
        </Section>

        <Hr style={hr} />

        <Text style={footerText}>
          This escalation was sent because the initial reminder period (7 days) plus grace period (14 days) has elapsed without acknowledgment.
        </Text>

        <Text style={footerText}>
          If you need assistance or have concerns about this escalation, please contact your IG lead or practice administrator immediately.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          This is an automated escalation from the Policy Management System at {practiceName}.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PolicyEscalationEmail;

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

const alertBanner = {
  backgroundColor: '#dc2626',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '0',
};

const alertText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const h1 = {
  color: '#dc2626',
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

const urgentText = {
  color: '#dc2626',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 20px',
  fontWeight: '600',
};

const summaryBox = {
  margin: '24px 20px',
  padding: '20px',
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  border: '2px solid #dc2626',
};

const summaryText = {
  color: '#991b1b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '24px',
};

const staffListContainer = {
  margin: '24px 20px',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e1e4e8',
};

const staffItem = {
  marginBottom: '24px',
  paddingBottom: '24px',
  borderBottom: '2px solid #e1e4e8',
};

const staffName = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 4px 0',
};

const staffEmail = {
  color: '#666',
  fontSize: '14px',
  margin: '0 0 12px 0',
};

const policyCountText = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '600',
  margin: '12px 0 8px 0',
};

const policyDetail = {
  marginLeft: '16px',
  marginBottom: '8px',
};

const policyTitle = {
  color: '#333',
  fontSize: '14px',
  margin: '4px 0',
};

const policyOverdue = {
  color: '#666',
  fontSize: '13px',
  margin: '2px 0 2px 16px',
};

const overdueHighlight = {
  color: '#dc2626',
  fontWeight: '600',
};

const actionList = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '26px',
  margin: '12px 20px 24px',
  paddingLeft: '4px',
};

const buttonContainer = {
  margin: '32px 20px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 40px',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const warningBox = {
  margin: '24px 20px',
  padding: '16px',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  border: '1px solid #f59e0b',
};

const warningTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 8px 0',
};

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '8px 0',
};

const warningList = {
  color: '#92400e',
  fontSize: '14px',
  margin: '8px 0',
  lineHeight: '22px',
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
