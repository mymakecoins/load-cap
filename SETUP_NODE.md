# Configuração do Node.js

## Problema: Versão Antiga do Node.js

Se você encontrar o erro:
```
SyntaxError: Unexpected token '.'
```

Isso significa que você está usando uma versão antiga do Node.js (anterior à 14). O projeto requer **Node.js 22+**.

## Solução Rápida

### Se você tem nvm instalado:

1. **Carregue o nvm e instale Node.js 22:**
```bash
source ~/.nvm/nvm.sh
nvm install 22
nvm use 22
nvm alias default 22
```

2. **Reinstale o pnpm:**
```bash
npm install -g pnpm@latest
```

3. **Verifique as versões:**
```bash
node --version  # Deve mostrar v22.x.x
pnpm --version  # Deve mostrar 10.x.x
```

### Configurar nvm para carregar automaticamente

Adicione ao final do seu `~/.bashrc`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

Depois execute:
```bash
source ~/.bashrc
```

### Se você NÃO tem nvm:

1. **Instale o nvm:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
```

2. **Instale Node.js 22:**
```bash
nvm install 22
nvm use 22
nvm alias default 22
```

3. **Reinstale o pnpm:**
```bash
npm install -g pnpm@latest
```

### Alternativa: Usar NodeSource (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

**Nota:** Esta opção instala globalmente e pode conflitar com outras versões.

## Verificação

Após configurar, teste:

```bash
node --version  # Deve ser v22.x.x ou superior
pnpm --version  # Deve ser 10.x.x ou superior
```

## Troubleshooting

### "nvm: command not found"

O nvm não está carregado no shell atual. Execute:
```bash
source ~/.nvm/nvm.sh
```

Ou adicione ao `~/.bashrc` (veja acima).

### "pnpm: command not found"

Reinstale o pnpm:
```bash
npm install -g pnpm@latest
```

### Versão do Node.js ainda antiga

Verifique qual Node.js está sendo usado:
```bash
which node
node --version
```

Se ainda mostrar versão antiga, certifique-se de que o nvm está carregado e use:
```bash
nvm use 22
```

---

**Última atualização**: Novembro 2025

