-- Create the enum types first
CREATE TYPE responsible_role AS ENUM ('practice_manager', 'nurse', 'doctor', 'admin_staff', 'receptionist');
CREATE TYPE frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'as_needed');

-- Create some sample process templates for new practices
DO $$
DECLARE
    latest_practice_id UUID;
    template_id_1 UUID := gen_random_uuid();
    template_id_2 UUID := gen_random_uuid();
    template_id_3 UUID := gen_random_uuid();
    user_id UUID;
BEGIN
    -- Get the latest practice ID
    SELECT id INTO latest_practice_id FROM practices ORDER BY created_at DESC LIMIT 1;
    
    -- Get a user from this practice to assign tasks to
    SELECT id INTO user_id FROM users WHERE practice_id = latest_practice_id LIMIT 1;
    
    IF latest_practice_id IS NOT NULL THEN
        -- Insert sample process templates
        INSERT INTO process_templates (
            id,
            name,
            practice_id,
            responsible_role,
            frequency,
            steps,
            evidence_hint,
            storage_hints,
            remedials
        ) VALUES 
        (
            template_id_1,
            'Daily Practice Review',
            latest_practice_id,
            'practice_manager',
            'daily',
            '[
                {"title": "Review patient appointments", "description": "Check daily appointment schedule and prepare for patient visits"},
                {"title": "Check emergency protocols", "description": "Verify emergency contact numbers and procedures are up to date"},
                {"title": "Review staff assignments", "description": "Confirm staff coverage and responsibilities for the day"}
            ]'::jsonb,
            'Keep evidence in the practice management system',
            '{"location": "Practice Management System", "path": "/daily-reviews"}'::jsonb,
            '{"overdue": "Notify practice manager immediately", "missed": "Schedule emergency review within 24 hours"}'::jsonb
        ),
        (
            template_id_2,
            'Weekly Safety Audit',
            latest_practice_id,
            'nurse',
            'weekly',
            '[
                {"title": "Check medical equipment", "description": "Inspect and test all critical medical equipment"},
                {"title": "Review infection control procedures", "description": "Verify hygiene protocols are being followed"},
                {"title": "Update safety documentation", "description": "Complete weekly safety checklist and file reports"}
            ]'::jsonb,
            'Document with photos and signed checklists',
            '{"location": "Safety Documentation Folder", "path": "/safety-audits"}'::jsonb,
            '{"overdue": "Escalate to practice manager", "missed": "Complete within 48 hours and file incident report"}'::jsonb
        ),
        (
            template_id_3,
            'Monthly Compliance Review',
            latest_practice_id,
            'practice_manager',
            'monthly',
            '[
                {"title": "Review patient records compliance", "description": "Audit patient records for completeness and accuracy"},
                {"title": "Check staff certification status", "description": "Verify all staff certifications are current"},
                {"title": "Update practice policies", "description": "Review and update practice policies as needed"}
            ]'::jsonb,
            'Maintain compliance documentation and certificates',
            '{"location": "Compliance Archive", "path": "/monthly-reviews"}'::jsonb,
            '{"overdue": "Schedule immediate review meeting", "missed": "Contact regulatory body and file compliance report"}'::jsonb
        );

        -- Create some process instances if we have a user
        IF user_id IS NOT NULL THEN
            INSERT INTO process_instances (
                id,
                template_id,
                practice_id,
                assignee_id,
                status,
                period_start,
                period_end,
                due_at
            ) VALUES 
            (
                gen_random_uuid(),
                template_id_1,
                latest_practice_id,
                user_id,
                'pending',
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '1 day',
                CURRENT_DATE + INTERVAL '1 day'
            ),
            (
                gen_random_uuid(),
                template_id_2,
                latest_practice_id,
                user_id,
                'pending',
                CURRENT_DATE - INTERVAL '6 days',
                CURRENT_DATE + INTERVAL '1 day',
                CURRENT_DATE + INTERVAL '1 day'
            ),
            (
                gen_random_uuid(),
                template_id_3,
                latest_practice_id,
                user_id,
                'pending',
                CURRENT_DATE - INTERVAL '29 days',
                CURRENT_DATE + INTERVAL '1 day',
                CURRENT_DATE + INTERVAL '7 days'
            );
        END IF;
    END IF;
END $$;