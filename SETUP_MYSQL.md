# Configuração do MySQL para o Projeto

## Problema: Autenticação via Socket (auth_socket)

No Ubuntu/Debian, o MySQL geralmente vem configurado para usar autenticação via socket (`auth_socket`) ao invés de senha. Isso causa o erro:

```
Error: Access denied for user 'root'@'localhost'
code: 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR'
```

## Soluções

### Opção 1: Criar Novo Usuário (Recomendado)

Esta é a opção mais segura. Crie um usuário específico para o projeto:

1. **Conecte ao MySQL como root:**
```bash
sudo mysql
```

2. **Execute os seguintes comandos SQL:**
```sql
-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS team_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar usuário
CREATE USER IF NOT EXISTS 'team_management'@'localhost' IDENTIFIED BY 'team_management_password';

-- Dar permissões
GRANT ALL PRIVILEGES ON team_management.* TO 'team_management'@'localhost';

-- Aplicar mudanças
FLUSH PRIVILEGES;

-- Verificar
SELECT user, host, plugin FROM mysql.user WHERE user = 'team_management';

-- Sair
EXIT;
```

3. **Atualize o arquivo `.env.local`:**
```env
DATABASE_URL=mysql://team_management:team_management_password@localhost:3306/team_management
```

### Opção 2: Alterar Root para Usar Senha

Se preferir usar o usuário root:

1. **Conecte ao MySQL:**
```bash
sudo mysql
```

2. **Execute os comandos SQL:**
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;
EXIT;
```

3. **Atualize o arquivo `.env.local` (se necessário):**
```env
DATABASE_URL=mysql://root:root@localhost:3306/team_management
```

### Opção 3: Usar Socket (Avançado)

Se quiser manter a autenticação via socket, você pode configurar o MySQL para aceitar conexões via socket:

1. **Edite o arquivo de configuração:**
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

2. **Adicione ou modifique:**
```ini
[mysqld]
socket = /var/run/mysqld/mysqld.sock
```

3. **Reinicie o MySQL:**
```bash
sudo systemctl restart mysql
```

**Nota:** Esta opção requer configuração adicional e não é recomendada para desenvolvimento.

## Verificação

Após configurar, teste a conexão:

```bash
# Com novo usuário
mysql -u team_management -pteam_management_password -e "SELECT 1;"

# Ou com root (se alterou)
mysql -u root -proot -e "SELECT 1;"
```

## Troubleshooting

### Erro: "Access denied for user"

- Verifique se o usuário foi criado: `SELECT user FROM mysql.user;`
- Verifique se as permissões foram concedidas: `SHOW GRANTS FOR 'team_management'@'localhost';`
- Verifique se o plugin de autenticação está correto: `SELECT user, plugin FROM mysql.user WHERE user='team_management';`

### Erro: "Can't connect to MySQL server"

- Verifique se o MySQL está rodando: `sudo systemctl status mysql`
- Verifique a porta: `sudo netstat -tlnp | grep mysql`
- Verifique o socket: `sudo ls -la /var/run/mysqld/mysqld.sock`

### Resetar Senha do Root

Se precisar resetar a senha do root:

```bash
# Parar MySQL
sudo systemctl stop mysql

# Iniciar MySQL em modo seguro
sudo mysqld_safe --skip-grant-tables &

# Conectar sem senha
mysql -u root

# Alterar senha
ALTER USER 'root'@'localhost' IDENTIFIED BY 'nova_senha';
FLUSH PRIVILEGES;
EXIT;

# Reiniciar MySQL normalmente
sudo systemctl restart mysql
```

## Referências

- [MySQL Authentication Plugins](https://dev.mysql.com/doc/refman/8.0/en/authentication-plugins.html)
- [MySQL User Management](https://dev.mysql.com/doc/refman/8.0/en/user-account-management.html)

