const { exec } = require('child_process');

console.log('Cleaning up port 5000...');

const command = process.platform === 'win32'
    ? 'netstat -ano | findstr :5000'
    : 'lsof -i :5000 -t';

exec(command, (err, stdout) => {
    if (err || !stdout) {
        console.log('Port 5000 is already free.');
        return;
    }

    const lines = stdout.trim().split('\n');
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = process.platform === 'win32' ? parts[parts.length - 1] : parts[0];

        if (pid && pid !== '0') {
            console.log(`Killing process ${pid}...`);
            exec(`taskkill /F /PID ${pid}`, (killErr) => {
                if (killErr) console.error(`Failed to kill ${pid}:`, killErr.message);
                else console.log(`Process ${pid} terminated.`);
            });
        }
    });
});
