# Dados para testes de performance

Com o ambiente do backend configurado e as migrações aplicadas, execute:

```powershell
uv run python manage.py seed_performance
```

O comando cria, por padrão, 50 contas (`perf_0001` a `perf_0050`), 1.000 metas, 8.000 tarefas e 6.000 curtidas em metas públicas. Ele usa dados variados e uma semente fixa para que novas execuções mantenham a mesma carga. As credenciais geradas ficam em `backend/.seed-credentials.txt`, ignorado pelo Git. As contas e metas já existentes fora do prefixo da carga são preservadas.

É possível ajustar o volume com `--users`, `--goals-per-user`, `--tasks-per-goal`, `--likes` e `--prefix`. Exemplo:

```powershell
uv run python manage.py seed_performance --users 100 --goals-per-user 30 --tasks-per-goal 10 --likes 15000 --prefix perf2
```

As curtidas das contas de carga nas metas de carga são sincronizadas com a quantidade solicitada a cada execução. Use contas e prefixos de carga somente para testes. O comando utiliza a biblioteca padrão do Python; Faker não é necessário.
