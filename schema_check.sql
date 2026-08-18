SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pending_actions';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_permissions';
