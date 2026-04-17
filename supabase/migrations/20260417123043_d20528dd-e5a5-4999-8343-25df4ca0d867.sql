UPDATE auth.users
SET encrypted_password = crypt('Arthur@2026', gen_salt('bf'))
WHERE id = 'c8298b22-2177-4eac-999a-7c8e263c29bb';