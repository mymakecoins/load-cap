import { config } from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Carrega variáveis de ambiente
config({ path: resolve(projectRoot, '.env.local') });

// Pega o comando a ser executado (generate ou migrate)
const command = process.argv[2] || 'generate';

// Caminho para o drizzle-kit
const drizzleKitPath = join(projectRoot, 'node_modules', '.bin', 'drizzle-kit');

// Executa o drizzle-kit com as variáveis de ambiente carregadas
const drizzleKit = spawn(drizzleKitPath, [command], {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: projectRoot,
});

drizzleKit.on('close', (code) => {
  process.exit(code || 0);
});

drizzleKit.on('error', (error) => {
  console.error('Erro ao executar drizzle-kit:', error);
  process.exit(1);
});

