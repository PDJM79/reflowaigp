-- Seed the 24 standard GP roles into role_catalog (global reference data the RBAC /
-- capability system depends on). Adapted from migration 20251219141327: the current
-- schema models role_catalog.default_capabilities as text[] (the `capability` enum was
-- abandoned in favour of text), so the ::public.capability[] casts are dropped here.
-- Idempotent via ON CONFLICT (role_key).
INSERT INTO public.role_catalog (role_key, display_name, category, default_capabilities, description) VALUES
('gp_partner','GP Partner / GP Lead','clinical', ARRAY['view_policies','ack_policies','view_training','run_reports','view_dashboards','configure_practice','manage_users'],'Clinical leadership, governance, escalation'),
('salaried_gp','Salaried GP / GP Retainer','clinical', ARRAY['view_policies','ack_policies','view_training','upload_certificate','view_dashboards'],'Routine/urgent consultations, chronic disease management'),
('gp_registrar','GP Registrar (Trainee)','clinical', ARRAY['view_policies','ack_policies','view_training','upload_certificate'],'Supervised clinics; portfolio tasks'),
('anp_acp','ANP / ACP','clinical', ARRAY['view_policies','ack_policies','view_training','upload_certificate','record_script','record_fridge_temp'],'Independent clinics within competence'),
('practice_nurse','Practice Nurse','clinical', ARRAY['view_policies','ack_policies','view_training','upload_certificate','record_script','record_fridge_temp','run_ipc_audit'],'LTC clinics, immunisations, cytology'),
('nursing_associate','Nursing Associate / Assistant Practitioner','clinical', ARRAY['view_policies','ack_policies','record_script','record_fridge_temp'],'Protocol-led tasks'),
('hca_phleb','HCA / Phlebotomist','clinical', ARRAY['view_policies','ack_policies','record_script','record_fridge_temp'],'Phlebotomy, vitals, ECGs'),
('clinical_pharmacist','Clinical Pharmacist / Pharmacy Tech (PCN)','pcn', ARRAY['view_policies','ack_policies'],'SMRs, repeat workflow support'),
('fcp','First Contact Physiotherapist (PCN)','pcn', ARRAY['view_policies','ack_policies'],'MSK first-contact triage'),
('mhp','Mental Health Practitioner (PCN)','pcn', ARRAY['view_policies','ack_policies'],'MH triage & brief interventions'),
('splw','Social Prescribing Link Worker (PCN)','pcn', ARRAY['view_policies','ack_policies'],'Non-medical needs & signposting'),
('paramedic','Paramedic / Community Paramedic (PCN)','pcn', ARRAY['view_policies','ack_policies'],'Urgent assessment & home visits'),
('practice_manager','Practice Manager','admin', ARRAY['view_policies','ack_policies','manage_policies','approve_policies','manage_redactions','manage_cleaning','manage_ipc','manage_fire','manage_hs','manage_rooms','manage_training','manage_appraisals','manage_claims','manage_complaint','manage_incident','manage_medical_requests','manage_fridges','manage_qof','run_reports','view_dashboards','manage_users','assign_roles','configure_practice','configure_notifications'],'Ops, HR, finance, governance'),
('deputy_pm','Deputy PM / Operations Manager','admin', ARRAY['view_policies','ack_policies','manage_cleaning','manage_ipc','manage_fire','manage_hs','manage_rooms','manage_training','manage_appraisals','manage_claims','manage_complaint','manage_incident','manage_medical_requests','manage_fridges','manage_qof','run_reports','view_dashboards','configure_practice'],'Ops support and projects'),
('receptionist','Receptionist / Care Navigator','admin', ARRAY['view_policies','ack_policies','log_complaint','report_incident','view_dashboards'],'Front desk & signposting'),
('medical_secretary','Medical Secretary','admin', ARRAY['view_policies','ack_policies','manage_medical_requests'],'Referrals & correspondence'),
('doc_admin','Workflow / Document Admin','admin', ARRAY['view_policies','ack_policies','report_incident'],'Scanning/coding/summarising'),
('rx_clerk','Prescription Clerk / Medicines Admin','admin', ARRAY['view_policies','ack_policies'],'Repeat requests & queries'),
('data_qof_admin','Data / QOF Administrator','admin', ARRAY['view_policies','ack_policies','manage_qof','run_reports'],'Call/recall, registers, QOF/IIF'),
('patient_services','Patient Services / Complaints & Access Lead','admin', ARRAY['view_policies','ack_policies','manage_complaint'],'Complaints & access'),
('safeguarding_lead','Safeguarding Lead','governance', ARRAY['view_policies','ack_policies','manage_incident','run_reports'],'Safeguarding oversight'),
('ig_lead','Information Governance / Data Protection Lead','governance', ARRAY['view_policies','ack_policies','manage_policies','approve_policies','manage_redactions','manage_complaint','run_reports'],'GDPR/DSPT/FOI/SARs'),
('it_lead','IT / Systems Lead','it', ARRAY['view_policies','ack_policies','configure_practice','configure_notifications'],'Systems admin/cyber/BCP'),
('estates_cleaner','Estates / Facilities / Cleaner','support', ARRAY['complete_cleaning','manage_fridges','run_fire_checks'],'Cleaning to IPC standards; facilities checks')
ON CONFLICT (role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  default_capabilities = EXCLUDED.default_capabilities,
  description = EXCLUDED.description,
  updated_at = now();
