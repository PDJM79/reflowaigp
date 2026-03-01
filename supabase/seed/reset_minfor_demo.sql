-- =============================================================
-- Minfor Surgery — Nightly Demo Reset
-- Practice ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
--
-- Deletes all transactional/activity data for this practice and
-- re-inserts a realistic, dated set of demo records so every
-- demo starts from the same clean baseline.
--
-- Preserved (not touched):
--   practices, users, process_templates, policy_documents,
--   fridge_units, cleaning_zones, cleaning_tasks, rooms,
--   training_catalogue, role_assignments, organization_setup,
--   regulatory_frameworks, regulatory_standards
--
-- Run via: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f reset_minfor_demo.sql
-- =============================================================

DO $$
DECLARE
  p   UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  -- User IDs (populated below)
  pm_id    UUID;
  gp_id    UUID;
  nurse_id UUID;
  hca_id   UUID;
  rec_id   UUID;
  clean_id UUID;

  -- Infrastructure IDs
  f1_id UUID;  -- fridge unit 1
  f2_id UUID;  -- fridge unit 2
  z1_id UUID;  -- cleaning zone 1
  z2_id UUID;  -- cleaning zone 2

  ts TIMESTAMPTZ;
BEGIN
  -- ── Guard ─────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM practices WHERE id = p) THEN
    RAISE EXCEPTION 'Minfor Surgery demo practice not found (id: %)', p;
  END IF;
  RAISE NOTICE '[reset] Starting Minfor Surgery demo reset at %', NOW();

  -- ── Capture user IDs ──────────────────────────────────────────────
  SELECT id INTO pm_id
    FROM users WHERE practice_id = p AND role = 'practice_manager' AND is_active = true LIMIT 1;
  SELECT id INTO gp_id
    FROM users WHERE practice_id = p AND role = 'gp' AND is_active = true LIMIT 1;
  SELECT id INTO nurse_id
    FROM users WHERE practice_id = p AND role IN ('nurse','nurse_lead') AND is_active = true LIMIT 1;
  SELECT id INTO hca_id
    FROM users WHERE practice_id = p AND role = 'hca' AND is_active = true LIMIT 1;
  SELECT id INTO rec_id
    FROM users WHERE practice_id = p AND role IN ('reception','reception_lead') AND is_active = true LIMIT 1;
  SELECT id INTO clean_id
    FROM users WHERE practice_id = p AND role = 'cleaner' AND is_active = true LIMIT 1;

  -- Fallbacks so inserts never fail on NULL assignee
  IF pm_id    IS NULL THEN SELECT id INTO pm_id    FROM users WHERE practice_id = p AND is_active = true LIMIT 1; END IF;
  IF gp_id    IS NULL THEN gp_id    := pm_id; END IF;
  IF nurse_id IS NULL THEN nurse_id := pm_id; END IF;
  IF hca_id   IS NULL THEN hca_id   := pm_id; END IF;
  IF rec_id   IS NULL THEN rec_id   := pm_id; END IF;
  IF clean_id IS NULL THEN clean_id := pm_id; END IF;

  -- ── Capture infrastructure IDs ────────────────────────────────────
  SELECT id INTO f1_id FROM fridge_units  WHERE practice_id = p AND is_active = true ORDER BY created_at LIMIT 1;
  SELECT id INTO f2_id FROM fridge_units  WHERE practice_id = p AND is_active = true ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO z1_id FROM cleaning_zones WHERE practice_id = p AND is_active = true ORDER BY created_at LIMIT 1;
  SELECT id INTO z2_id FROM cleaning_zones WHERE practice_id = p AND is_active = true ORDER BY created_at OFFSET 1 LIMIT 1;

  RAISE NOTICE '[reset] pm=% gp=% nurse=% hca=% f1=% f2=% z1=% z2=%',
    pm_id, gp_id, nurse_id, hca_id, f1_id, f2_id, z1_id, z2_id;

  -- ==================================================================
  -- STEP 1 — DELETE transactional data
  -- (order respects FK dependencies; CASCADE handles child rows where
  --  the FK is defined with ON DELETE CASCADE, but explicit deletes
  --  are safer across DB versions)
  -- ==================================================================

  -- Process instances → step_instances (cascade), evidence (cascade)
  DELETE FROM step_instances
    WHERE process_instance_id IN (SELECT id FROM process_instances WHERE practice_id = p);
  DELETE FROM process_instances WHERE practice_id = p;

  -- Evidence
  DELETE FROM evidence_v2 WHERE practice_id = p;

  -- Operational logs
  DELETE FROM cleaning_logs   WHERE practice_id = p;
  DELETE FROM fridge_readings WHERE practice_id = p;

  -- Claims
  DELETE FROM claim_items
    WHERE claim_run_id IN (SELECT id FROM claim_runs WHERE practice_id = p);
  DELETE FROM claim_runs WHERE practice_id = p;

  -- Tasks & activity
  DELETE FROM tasks      WHERE practice_id = p;
  DELETE FROM incidents  WHERE practice_id = p;
  DELETE FROM complaints WHERE practice_id = p;

  -- IPC
  DELETE FROM ipc_actions WHERE practice_id = p;
  DELETE FROM ipc_audits  WHERE practice_id = p;

  -- Fire
  DELETE FROM fire_actions               WHERE practice_id = p;
  DELETE FROM fire_risk_assessments_v2   WHERE practice_id = p;

  -- HR
  DELETE FROM training_records WHERE practice_id = p;
  DELETE FROM dbs_checks       WHERE practice_id = p;

  -- Risk
  DELETE FROM risk_register WHERE practice_id = p;

  -- Compliance
  DELETE FROM compliance_status WHERE practice_id = p;

  -- Policy acknowledgments (keeps policy_documents intact)
  DELETE FROM policy_acknowledgments
    WHERE policy_id IN (SELECT id FROM policy_documents WHERE practice_id = p);

  -- Comms / audit
  DELETE FROM notifications WHERE practice_id = p;
  DELETE FROM audit_logs    WHERE practice_id = p;
  DELETE FROM email_logs    WHERE practice_id = p;

  RAISE NOTICE '[reset] Deleted existing transactional data';

  -- ==================================================================
  -- STEP 2 — INSERT fresh demo data
  -- ==================================================================

  -- ── TASKS ─────────────────────────────────────────────────────────
  -- Mix: pending (soon), pending (future), overdue, completed/submitted
  -- NOTE: column is assignee_id per shared/schema.ts.
  --       If your DB uses assigned_to_user_id, replace below.
  INSERT INTO tasks (id, practice_id, title, description, priority, status, assignee_id, due_at, module, created_at, updated_at)
  VALUES
    -- Urgent / imminent
    (gen_random_uuid(), p,
      'Complaint Acknowledgement — Mrs Thompson',
      'Send formal 3-working-day acknowledgement letter for complaint received 2 days ago.',
      'urgent', 'pending', pm_id,
      NOW() + INTERVAL '1 day', 'complaints', NOW(), NOW()),

    (gen_random_uuid(), p,
      'Legionella Weekly Flush Check',
      'Run all low-use outlets for 2 minutes and record temperatures at designated points.',
      'medium', 'pending', hca_id,
      NOW() + INTERVAL '2 days', 'facilities', NOW(), NOW()),

    -- Pending — this week
    (gen_random_uuid(), p,
      'Monthly Script Reconciliation',
      'Review all prescriptions issued this month against NHS BSA submission. Flag discrepancies.',
      'high', 'pending', nurse_id,
      NOW() + INTERVAL '3 days', 'claims', NOW(), NOW()),

    (gen_random_uuid(), p,
      'Fridge Temperature Monthly Audit',
      'Verify all vaccine fridge logs are within 2–8 °C range over the past 30 days.',
      'medium', 'pending', nurse_id,
      NOW() + INTERVAL '5 days', 'fridge', NOW(), NOW()),

    (gen_random_uuid(), p,
      'Fire Safety Equipment Check',
      'Inspect all extinguishers, smoke alarms and emergency exits throughout the building.',
      'high', 'pending', pm_id,
      NOW() + INTERVAL '7 days', 'fire', NOW(), NOW()),

    -- Pending — next 2–3 weeks
    (gen_random_uuid(), p,
      'Staff DBS Renewal — Dr Patel',
      'Process enhanced DBS renewal for Dr Patel; current certificate expires in 30 days.',
      'high', 'pending', pm_id,
      NOW() + INTERVAL '10 days', 'hr', NOW(), NOW()),

    (gen_random_uuid(), p,
      'IPC Six-Monthly Audit',
      'Complete infection prevention and control audit across all clinical areas. Due May & Nov.',
      'high', 'pending', nurse_id,
      NOW() + INTERVAL '14 days', 'ipc', NOW(), NOW()),

    (gen_random_uuid(), p,
      'COSHH Assessment Update — Cleaning Products',
      'Review COSHH risk assessments for new cleaning products introduced this quarter.',
      'medium', 'pending', hca_id,
      NOW() + INTERVAL '12 days', 'facilities', NOW(), NOW()),

    (gen_random_uuid(), p,
      'GDPR Refresher Training — All Clinical Staff',
      'All clinical staff must complete GDPR refresher module before end of month.',
      'medium', 'pending', pm_id,
      NOW() + INTERVAL '18 days', 'training', NOW(), NOW()),

    (gen_random_uuid(), p,
      'Update Safeguarding Policy',
      'Annual review of child and adult safeguarding policy — due version 4.0.',
      'medium', 'pending', pm_id,
      NOW() + INTERVAL '21 days', 'policies', NOW(), NOW()),

    -- Overdue (past due, still open)
    (gen_random_uuid(), p,
      'Hand Hygiene Audit — Q3',
      'Quarterly hand hygiene compliance spot-check across all clinical rooms.',
      'high', 'overdue', nurse_id,
      NOW() - INTERVAL '5 days', 'ipc',
      NOW() - INTERVAL '14 days', NOW() - INTERVAL '5 days'),

    (gen_random_uuid(), p,
      'Quarterly Risk Register Review',
      'Review all open risk register items; update likelihood and impact scores.',
      'medium', 'overdue', pm_id,
      NOW() - INTERVAL '3 days', 'risk',
      NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), p,
      'Medical Records Coding Audit',
      'Sample 20 patient records for coding accuracy and completeness. Report to clinical lead.',
      'medium', 'overdue', gp_id,
      NOW() - INTERVAL '2 days', 'clinical',
      NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),

    -- Completed / submitted
    (gen_random_uuid(), p,
      'Flu Vaccine Stock Count',
      'Count and reconcile remaining flu vaccine stock against purchase ledger.',
      'medium', 'closed', nurse_id,
      NOW() - INTERVAL '7 days', 'clinical',
      NOW() - INTERVAL '10 days', NOW() - INTERVAL '6 days'),

    (gen_random_uuid(), p,
      'Cleaning Schedule Annual Review',
      'Review and approve updated daily cleaning schedules for all zones.',
      'low', 'closed', pm_id,
      NOW() - INTERVAL '10 days', 'cleaning',
      NOW() - INTERVAL '14 days', NOW() - INTERVAL '9 days'),

    (gen_random_uuid(), p,
      'Sharps Disposal Audit',
      'Check all sharps bins are within date, not overfilled, and correctly labelled.',
      'high', 'closed', nurse_id,
      NOW() - INTERVAL '14 days', 'ipc',
      NOW() - INTERVAL '18 days', NOW() - INTERVAL '13 days'),

    (gen_random_uuid(), p,
      'Reception Team Annual Appraisals',
      'Conduct annual performance appraisals for all reception staff members.',
      'medium', 'submitted', pm_id,
      NOW() - INTERVAL '20 days', 'hr',
      NOW() - INTERVAL '25 days', NOW() - INTERVAL '18 days'),

    (gen_random_uuid(), p,
      'Legionella Water Temperature Check',
      'Record water outlet temperatures at all designated points on the schematic.',
      'high', 'closed', hca_id,
      NOW() - INTERVAL '2 days', 'facilities',
      NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day');

  -- ── FRIDGE READINGS (last 7 days, twice daily) ────────────────────
  IF f1_id IS NOT NULL THEN
    INSERT INTO fridge_readings
      (id, practice_id, fridge_id, reading_date, temperature,
       recorded_by, is_out_of_range, action_taken, created_at)
    SELECT
      gen_random_uuid(),
      p,
      f1_id,
      gs.ts,
      -- One excursion 4 days ago (AM reading); otherwise 4–6 °C
      CASE
        WHEN gs.ts::date = CURRENT_DATE - 4
         AND EXTRACT(hour FROM gs.ts) BETWEEN 7 AND 9
        THEN 8.9
        ELSE round((4.0 + random() * 2.0)::numeric, 1)
      END,
      CASE WHEN EXTRACT(hour FROM gs.ts) < 13 THEN hca_id ELSE nurse_id END,
      CASE
        WHEN gs.ts::date = CURRENT_DATE - 4
         AND EXTRACT(hour FROM gs.ts) BETWEEN 7 AND 9
        THEN true
        ELSE false
      END,
      CASE
        WHEN gs.ts::date = CURRENT_DATE - 4
         AND EXTRACT(hour FROM gs.ts) BETWEEN 7 AND 9
        THEN 'Door found ajar on morning check. Sealed immediately. Temp returned to range by 10:00. Vaccines quarantined pending pharmacist review.'
        ELSE NULL
      END,
      gs.ts
    FROM generate_series(
      (NOW() - INTERVAL '7 days')::timestamptz,
      (NOW() - INTERVAL '2 hours')::timestamptz,
      INTERVAL '12 hours'
    ) AS gs(ts);
  END IF;

  IF f2_id IS NOT NULL THEN
    INSERT INTO fridge_readings
      (id, practice_id, fridge_id, reading_date, temperature,
       recorded_by, is_out_of_range, created_at)
    SELECT
      gen_random_uuid(),
      p,
      f2_id,
      gs.ts,
      round((3.5 + random() * 2.5)::numeric, 1),
      CASE WHEN EXTRACT(hour FROM gs.ts) < 13 THEN hca_id ELSE nurse_id END,
      false,
      gs.ts
    FROM generate_series(
      (NOW() - INTERVAL '7 days')::timestamptz,
      (NOW() - INTERVAL '2 hours')::timestamptz,
      INTERVAL '12 hours'
    ) AS gs(ts);
  END IF;

  -- ── CLEANING LOGS (last 7 days, one entry per zone per day) ───────
  IF z1_id IS NOT NULL THEN
    INSERT INTO cleaning_logs
      (id, practice_id, zone_id, log_date, completed_by, completed_at,
       notes, has_issue, issue_description, created_at)
    SELECT
      gen_random_uuid(),
      p,
      z1_id,
      gs.d,
      clean_id,
      gs.d + INTERVAL '35 minutes',
      CASE WHEN gs.d::date = CURRENT_DATE - 2
           THEN 'Spillage cleaned, disposable roll restocked. Incident log updated.' ELSE NULL END,
      CASE WHEN gs.d::date = CURRENT_DATE - 2 THEN true ELSE false END,
      CASE WHEN gs.d::date = CURRENT_DATE - 2
           THEN 'Bodily fluid spill near entrance — full PPE used, area cordoned, bio-hazard clean completed' ELSE NULL END,
      gs.d
    FROM generate_series(
      CURRENT_DATE - 7,
      CURRENT_DATE - 1,
      INTERVAL '1 day'
    ) AS gs(d);
  END IF;

  IF z2_id IS NOT NULL THEN
    INSERT INTO cleaning_logs
      (id, practice_id, zone_id, log_date, completed_by, completed_at, created_at)
    SELECT
      gen_random_uuid(),
      p,
      z2_id,
      gs.d,
      clean_id,
      gs.d + INTERVAL '50 minutes',
      gs.d
    FROM generate_series(
      CURRENT_DATE - 7,
      CURRENT_DATE - 1,
      INTERVAL '1 day'
    ) AS gs(d);
  END IF;

  -- ── INCIDENTS ─────────────────────────────────────────────────────
  INSERT INTO incidents
    (id, practice_id, reported_by_id, category, severity,
     description, date_occurred, location,
     immediate_actions, status, rag, created_at, updated_at)
  VALUES
    -- Active: amber near-miss
    (gen_random_uuid(), p, nurse_id,
      'near_miss', 'medium',
      'Nurse almost administered incorrect dose of methotrexate due to unclear prescription. Identified at mandatory second-check stage. No patient harm occurred.',
      NOW() - INTERVAL '3 days', 'Treatment Room 1',
      'Prescription voided and rewritten. Prescriber alerted. Double-check protocol reinforced with all clinical staff at emergency briefing.',
      'open', 'amber',
      NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

    -- Active: red data breach
    (gen_random_uuid(), p, nurse_id,
      'data_breach', 'high',
      'Patient consultation notes inadvertently shared with wrong patient via online records portal. Identified within 2 hours of send.',
      NOW() - INTERVAL '5 days', 'Online Patient Portal',
      'Portal access suspended for affected records. ICO notified within 72 hours. DPO investigation underway. Both patients contacted by telephone.',
      'open', 'red',
      NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

    -- Active: green patient experience
    (gen_random_uuid(), p, rec_id,
      'patient_experience', 'low',
      'Patient waited 50 minutes past appointment time without being informed of the delay. Raised concern verbally with reception on departure.',
      NOW() - INTERVAL '8 days', 'Waiting Area',
      'Apology offered and documented. Reception team reminded to proactively communicate delays to all waiting patients.',
      'open', 'green',
      NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'),

    -- Closed: red equipment / notifiable
    (gen_random_uuid(), p, pm_id,
      'equipment', 'high',
      'Emergency crash trolley found to contain adrenaline auto-injectors expired by 3 months. Trolley immediately sealed and taken out of service. All staff informed.',
      NOW() - INTERVAL '15 days', 'Resus Bay',
      'All expired medications removed and replaced. Monthly crash trolley check formally added to cleaning schedule. Reported to CQC as Notifiable Safety Incident.',
      'closed', 'red',
      NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days');

  -- ── COMPLAINTS ────────────────────────────────────────────────────
  INSERT INTO complaints
    (id, practice_id, complainant_name, received_at, channel,
     description, assigned_to,
     ack_due, ack_sent_at, final_due,
     status, category, severity, created_at, updated_at)
  VALUES
    -- Open: acknowledgement overdue
    (gen_random_uuid(), p,
      'Mrs Carol Thompson',
      NOW() - INTERVAL '2 days', 'letter',
      'Patient unable to obtain same-day appointment for urgent concern on three consecutive days. States she attended A&E unnecessarily as a result and received a diagnosis that should have been managed in primary care.',
      pm_id,
      NOW() + INTERVAL '1 day', NULL,
      NOW() + INTERVAL '40 days',
      'open', 'access', 'medium',
      NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

    -- In progress: ack sent, investigation ongoing
    (gen_random_uuid(), p,
      'Mr David Okafor',
      NOW() - INTERVAL '18 days', 'email',
      'Patient describes GP as dismissive during consultation and unwilling to issue a referral for specialist opinion despite patient reporting concerning symptoms for several weeks.',
      gp_id,
      NOW() - INTERVAL '15 days', NOW() - INTERVAL '16 days',
      NOW() + INTERVAL '22 days',
      'in_progress', 'clinical', 'high',
      NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days'),

    -- Closed
    (gen_random_uuid(), p,
      'Anonymous',
      NOW() - INTERVAL '45 days', 'online_form',
      'Complaint regarding cleanliness of waiting room and absence of hand sanitiser stations at the main entrance and clinical corridor.',
      pm_id,
      NOW() - INTERVAL '42 days', NOW() - INTERVAL '43 days',
      NOW() - INTERVAL '5 days',
      'closed', 'environment', 'low',
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '6 days');

  -- ── RISK REGISTER ─────────────────────────────────────────────────
  INSERT INTO risk_register
    (id, practice_id, title, description, category,
     likelihood, impact, risk_score,
     mitigations, owner_id, status, review_date,
     created_at, updated_at)
  VALUES
    (gen_random_uuid(), p,
      'Vaccine Cold Chain Breach',
      'Fridge Unit 1 recorded an 8.9 °C excursion 4 days ago. Unit is 9 years old and may be failing intermittently. A sustained breach would require batch recall.',
      'clinical', 3, 5, 15,
      'Quotes obtained for replacement unit (3 quotes required per procurement policy). Monitoring increased to 3× daily until replaced. Estates lead notified.',
      nurse_id, 'open',
      NOW() + INTERVAL '7 days',
      NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

    (gen_random_uuid(), p,
      'Inadequate Fire Warden Coverage',
      'Two of three trained fire wardens have left the practice in the last 6 months. Last fire warden refresher training was 14 months ago. Building has 3 floors.',
      'fire_safety', 3, 4, 12,
      'Three staff members booked on fire warden course (next available date: +3 weeks). Practice evacuation drill to be scheduled within 30 days.',
      pm_id, 'open',
      NOW() + INTERVAL '30 days',
      NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 days'),

    (gen_random_uuid(), p,
      'IT Single Point of Failure',
      'Only one staff member holds the password manager master credential. Extended absence or departure would result in no administrative IT access for the practice.',
      'information_governance', 2, 5, 10,
      'Deputy IT lead to be added to password manager and briefed on access procedures. Documented IT access plan to be reviewed at next governance meeting.',
      pm_id, 'open',
      NOW() + INTERVAL '14 days',
      NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),

    (gen_random_uuid(), p,
      'No Locum GP Cover Arrangement',
      'No formal locum or mutual-aid arrangement is in place. Extended GP sickness would create significant appointment backlogs and potential clinical risk.',
      'workforce', 2, 4, 8,
      'Register with local locum bank. Ensure minimum 2 vetted locum GPs available on 48-hour notice. Review locum cover policy at next partners meeting.',
      pm_id, 'open',
      NOW() + INTERVAL '45 days',
      NOW() - INTERVAL '90 days', NOW() - INTERVAL '10 days');

  -- ── TRAINING RECORDS ──────────────────────────────────────────────
  -- Inserts a standard set of records for every employee in this practice.
  -- Mix of current, expiring-soon, and already-expired to make the
  -- Training & HR pages interesting.
  INSERT INTO training_records
    (id, practice_id, employee_id, course_name,
     completed_at, expiry_date, is_mandatory,
     created_at, updated_at)
  SELECT
    gen_random_uuid(),
    p,
    e.id,
    c.course_name,
    NOW() - c.completed_offset,
    NOW() + c.expiry_offset,
    c.is_mandatory,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  FROM employees e
  CROSS JOIN (VALUES
    ('Basic Life Support',              INTERVAL '8 months',  INTERVAL '4 months',   true),
    ('Fire Safety Awareness',           INTERVAL '10 months', INTERVAL '2 months',   true),
    ('GDPR & Data Protection',          INTERVAL '14 months', INTERVAL '-2 months',  true),   -- expired
    ('Safeguarding Adults Level 2',     INTERVAL '6 months',  INTERVAL '18 months',  true),
    ('Safeguarding Children Level 2',   INTERVAL '5 months',  INTERVAL '19 months',  true),
    ('Information Governance',          INTERVAL '11 months', INTERVAL '1 month',    true),
    ('Resuscitation (Adults)',          INTERVAL '9 months',  INTERVAL '3 months',   true),
    ('Moving & Handling',               INTERVAL '23 months', INTERVAL '-11 months', false)   -- expired
  ) AS c(course_name, completed_offset, expiry_offset, is_mandatory)
  WHERE e.practice_id = p
    AND e.end_date IS NULL   -- only current employees
  LIMIT 80;                  -- guard against very large employee lists

  RAISE NOTICE '[reset] Minfor Surgery demo reset complete at %', NOW();
END;
$$;
