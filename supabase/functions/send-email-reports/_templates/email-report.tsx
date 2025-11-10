import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Row,
  Column,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface EmailReportProps {
  practiceName: string;
  periodType: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalSent: number;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
  failedCount: number;
  emailTypeBreakdown: Array<{
    type: string;
    count: number;
    openRate: number;
  }>;
}

export const EmailReportTemplate = ({
  practiceName,
  periodType,
  startDate,
  endDate,
  totalSent,
  deliveryRate,
  bounceRate,
  openRate,
  clickRate,
  failedCount,
  emailTypeBreakdown,
}: EmailReportProps) => (
  <Html>
    <Head />
    <Preview>
      Email Delivery Report for {practiceName} - {periodType === 'weekly' ? 'Weekly' : 'Monthly'} Summary
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          📊 Email Delivery Report
        </Heading>
        
        <Text style={text}>
          <strong>Practice:</strong> {practiceName}<br />
          <strong>Period:</strong> {periodType === 'weekly' ? 'Weekly' : 'Monthly'} Report<br />
          <strong>Date Range:</strong> {startDate} to {endDate}
        </Text>

        <Section style={statsSection}>
          <Heading as="h2" style={h2}>
            📈 Overall Statistics
          </Heading>
          
          <Row style={statRow}>
            <Column style={statColumn}>
              <div style={statBox}>
                <Text style={statNumber}>{totalSent}</Text>
                <Text style={statLabel}>Total Emails Sent</Text>
              </div>
            </Column>
            <Column style={statColumn}>
              <div style={statBox}>
                <Text style={{...statNumber, color: '#22c55e'}}>{deliveryRate}%</Text>
                <Text style={statLabel}>Delivery Rate</Text>
              </div>
            </Column>
          </Row>

          <Row style={statRow}>
            <Column style={statColumn}>
              <div style={statBox}>
                <Text style={{...statNumber, color: '#3b82f6'}}>{openRate}%</Text>
                <Text style={statLabel}>Open Rate</Text>
              </div>
            </Column>
            <Column style={statColumn}>
              <div style={statBox}>
                <Text style={{...statNumber, color: '#8b5cf6'}}>{clickRate}%</Text>
                <Text style={statLabel}>Click Rate</Text>
              </div>
            </Column>
          </Row>

          <Row style={statRow}>
            <Column style={statColumn}>
              <div style={statBox}>
                <Text style={{...statNumber, color: '#ef4444'}}>{bounceRate}%</Text>
                <Text style={statLabel}>Bounce Rate</Text>
              </div>
            </Column>
            <Column style={statColumn}>
              <div style={statBox}>
                <Text style={{...statNumber, color: '#f97316'}}>{failedCount}</Text>
                <Text style={statLabel}>Failed Emails</Text>
              </div>
            </Column>
          </Row>
        </Section>

        {emailTypeBreakdown.length > 0 && (
          <Section style={breakdownSection}>
            <Heading as="h2" style={h2}>
              📧 Email Type Breakdown
            </Heading>
            
            {emailTypeBreakdown.map((item, index) => (
              <div key={index} style={breakdownItem}>
                <Text style={breakdownType}>{item.type}</Text>
                <Text style={breakdownStats}>
                  {item.count} sent • {item.openRate}% open rate
                </Text>
              </div>
            ))}
          </Section>
        )}

        <Section style={actionSection}>
          <Text style={text}>
            {failedCount > 0 && (
              <>⚠️ <strong>Action Required:</strong> {failedCount} email(s) failed to send. Please review the Email Logs dashboard.</>
            )}
            {bounceRate > 10 && (
              <><br />⚠️ <strong>High Bounce Rate:</strong> Your bounce rate is above 10%. Consider reviewing your recipient list.</>
            )}
          </Text>
        </Section>

        <Text style={footer}>
          This is an automated report from your GP Practice Audit & Evidence Hub.<br />
          Log in to the dashboard to view detailed analytics and manage your email delivery.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailReportTemplate;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
};

const statsSection = {
  padding: '0 40px',
  marginTop: '32px',
};

const statRow = {
  marginBottom: '16px',
};

const statColumn = {
  width: '50%',
  padding: '0 8px',
};

const statBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
};

const statNumber = {
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  color: '#333',
};

const statLabel = {
  fontSize: '12px',
  color: '#666',
  margin: '4px 0 0',
};

const breakdownSection = {
  padding: '0 40px',
  marginTop: '32px',
};

const breakdownItem = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '8px',
};

const breakdownType = {
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
  textTransform: 'capitalize' as const,
};

const breakdownStats = {
  fontSize: '12px',
  color: '#666',
  margin: '0',
};

const actionSection = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '16px',
  margin: '32px 40px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  marginTop: '32px',
};
