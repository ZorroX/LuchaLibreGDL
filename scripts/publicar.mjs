// Compila el sitio para GitHub Pages y lo sube a la rama gh-pages.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REMOTO = 'https://github.com/ZorroX/LuchaLibreGDL.git';
const raiz = resolve(import.meta.dirname, '..');
const dist = resolve(raiz, 'dist');
const correr = (cmd, args, opciones = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opciones });

correr('npm', ['run', 'build'], { cwd: raiz, shell: true, env: { ...process.env, BASE_PATH: '/LuchaLibreGDL' } });
writeFileSync(resolve(dist, '.nojekyll'), '');

const nombre = execFileSync('git', ['config', 'user.name'], { cwd: raiz }).toString().trim();
const correo = execFileSync('git', ['config', 'user.email'], { cwd: raiz }).toString().trim();
const git = (...args) => correr('git', ['-c', `user.name=${nombre}`, '-c', `user.email=${correo}`, '-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', ...args], { cwd: dist });
const notas = process.argv.slice(2).flatMap((m) => ['-m', m]);

git('init', '-q', '-b', 'gh-pages');
git('add', '-A');
git('commit', '-q', '--allow-empty', '-m', 'Publicar sitio', ...notas);
git('push', '-f', REMOTO, 'gh-pages');
