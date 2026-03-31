

## Migração: Abrir RLS nas tabelas executions e robots

### O que será feito
Criar uma migração SQL que adiciona políticas `FOR ALL USING (true) WITH CHECK (true)` para o role `public` nas tabelas `executions` e `robots`, permitindo acesso irrestrito (incluindo o agent_bridge via anon key).

### Arquivo a criar

**`supabase/migrations/20260331000000_fix_rls_executions_robots.sql`**

```sql
DROP POLICY IF EXISTS "Allow all access to executions" ON public.executions;
DROP POLICY IF EXISTS "Allow all access to robots" ON public.robots;

CREATE POLICY "Allow all access to executions"
  ON public.executions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to robots"
  ON public.robots FOR ALL USING (true) WITH CHECK (true);
```

Nenhum outro arquivo será alterado. As políticas existentes de admin continuam no lugar — esta nova política permissiva se soma a elas.

