const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk').default;

const API_SECRET_FILE = 'data.txt';
const TELEGRAM_FILE = 'telegram.txt';

const getRandomUserAgent = () => {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
};

async function sendTelegramMessage(message) {
    try {
        const [botToken, chatId] = fs.readFileSync(TELEGRAM_FILE, 'utf8').trim().split(':');
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
        });
    } catch (err) {
        console.log(chalk.red('❌ Gagal kirim notifikasi Telegram:'), chalk.yellow(err.message));
    }
}

function toWIBTime(utcTime) {
    const date = new Date(utcTime);
    date.setHours(date.getHours() + 7); // UTC+7
    return date;
}

let lastEarningCheck = 0;

async function getUserData(apiSecret, bearerToken) {
    const url = `https://api.dashboard.3dos.io/api/profile/api/${apiSecret}`;
    try {
        const response = await axios.post(url, {}, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'User-Agent': getRandomUserAgent(),
                'Accept': '*/*',
                'Origin': 'chrome-extension://lpindahibbkakkdjifonckbhopdoaooe',
            }
        });

        if (response.data && response.data.status === "Success") {
            const data = response.data.data;
            const email = data.email;
            const earnings = data.todays_earning;
            const now = Date.now();

            // Cek earnings setiap 3 jam
            if (now - lastEarningCheck >= 3 * 60 * 60 * 1000) {
                const msg = `📊 *3DOS Earnings Update*\nEmail: \`${email}\`\nEarnings Today: *${earnings}*`;
                console.log(chalk.cyan(` ${msg.replace(/\*/g, '')}`));
                await sendTelegramMessage(msg);
            }

            // Cek klaim reward
            const nextClaim = toWIBTime(data.next_daily_reward_claim);
            if (Date.now() > nextClaim.getTime()) {
                const claimUrl = 'https://api.dashboard.3dos.io/api/claim-reward';
                try {
                    const claimRes = await axios.post(claimUrl, {}, {
                        headers: {
                            'Authorization': `Bearer ${bearerToken}`,
                            'User-Agent': getRandomUserAgent(),
                            'Accept': '*/*',
                            'Origin': 'chrome-extension://lpindahibbkakkdjifonckbhopdoaooe',
                        }
                    });

                    if (claimRes.data.status === "Success") {
                        const msg = `🎁 *Daily Reward Claimed*\nEmail: \`${email}\`\nMessage: ${claimRes.data.message}`;
                        console.log(chalk.green(`✅ ${msg.replace(/\*/g, '')}`));
                        await sendTelegramMessage(msg);
                    } else {
                        console.log(chalk.yellow(`⚠️ ${email} | ${claimRes.data.message}`));
                    }
                } catch (e) {
                    console.log(chalk.red(`❌ Claim Error for ${email}:`), chalk.yellow(e.message));
                }
            }
        } else {
            console.log(chalk.red(`❌ Failed to fetch user data: ${response.data.message}`));
        }
    } catch (error) {
        console.error(chalk.red('❌ Error fetching user data:'), chalk.yellow(error.message));
    }
}

async function processAccounts() {
    try {
        const lines = fs.readFileSync(API_SECRET_FILE, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) {
            console.log(chalk.red('❌ Tidak ada data di file.'));
            return;
        }

        for (const line of lines) {
            const [apiSecret, bearerToken] = line.split(':').map(e => e.trim());
            if (!apiSecret || !bearerToken) {
                console.log(chalk.red(`❌ Format salah di baris: ${line}`));
                continue;
            }

            console.log(chalk.blue(`🔁 Ping untuk API Secret: ${apiSecret.substring(0, 5)}...`));
            await getUserData(apiSecret, bearerToken);
        }

        lastEarningCheck = Date.now();
    } catch (err) {
        console.error(chalk.red('❌ Error membaca file akun:'), chalk.yellow(err.message));
    }
}

// Mulai dan set interval
processAccounts();
setInterval(processAccounts, 5 * 60 * 1000); // Ping setiap 5 menit
