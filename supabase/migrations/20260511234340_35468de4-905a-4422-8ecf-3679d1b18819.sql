UPDATE auth.users
SET encrypted_password = crypt('102030Mc', gen_salt('bf'))
WHERE email = 'arthurxk@hotmail.com';