import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const directory = new URL('../.local/cobalt/api/', import.meta.url);
if (!existsSync(new URL('src/cobalt.js', directory))) throw new Error('Install the local backend first. See docs/free-downloader.md.');
const child = spawn(process.execPath, ['--no-node-snapshot', 'src/cobalt.js'], { cwd: fileURLToPath(directory), stdio: 'inherit' });
child.on('error', () => { console.error('Could not start the local download backend.'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
