# Commit 13 - Dashboard administrativo

## Nova página inicial

```text
/administrativo
```

O login e a troca obrigatória de senha redirecionam para o dashboard.

## Módulos por papel

### Administrador

- Folhas e lançamentos
- Cadastros
- Relatórios e fechamento
- Plantões especiais

### Supervisor

- Folhas e lançamentos da empresa vinculada
- Cadastros de postos e funcionários da empresa vinculada
- Relatórios e fechamento da empresa vinculada

### Operador

- Folhas e lançamentos da empresa vinculada
- Relatórios da empresa vinculada

## Plantões especiais

O antigo módulo `/administrativo/plantoes` foi renomeado para Plantões especiais.
Ele é destinado somente aos contratos de atendimento exclusivo em finais de semana
e feriados e, enquanto utiliza configurações locais específicas, fica restrito ao
administrador.

Não há migration de banco neste commit.
