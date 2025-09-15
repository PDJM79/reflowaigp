-- Make the existing admin user a master user
UPDATE users 
SET is_master_user = true 
WHERE email = 'Reflowadmin@proton.me';